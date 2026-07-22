import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class FiscalService {
  constructor(private readonly prisma: PrismaService) {}

  private getFocusClient(token: string) {
    const isSandbox = true; // Por padrão, usa ambiente de homologação
    const baseURL = isSandbox 
      ? 'https://homologacao.focusnfe.com.br' 
      : 'https://api.focusnfe.com.br';
    
    return axios.create({
      baseURL,
      auth: {
        username: token,
        password: '',
      },
    });
  }

  async getFiscalConfig(tenantId: string) {
    const config = await this.prisma.fiscalConfig.findUnique({
      where: { tenantId },
    });
    if (!config) {
      throw new NotFoundException('Configuração fiscal não encontrada.');
    }
    return config;
  }

  async saveFiscalConfig(tenantId: string, dto: any) {
    // Buscar dados do Workshop para complementar
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: tenantId },
    });

    if (!workshop) {
      throw new NotFoundException('Oficina não encontrada.');
    }

    const config = await this.prisma.fiscalConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        cnpj: dto.cnpj || workshop.cnpj || '',
        inscricaoMunicipal: dto.inscricaoMunicipal || null,
        inscricaoEstadual: dto.inscricaoEstadual || null,
        regimeTributario: Number(dto.regimeTributario) || 1,
        optanteSimples: dto.optanteSimples !== undefined ? dto.optanteSimples : true,
        aliquotaISS: dto.aliquotaISS || 2.0,
        focusTokenSandbox: dto.focusTokenSandbox || null,
        focusTokenProd: dto.focusTokenProd || null,
      },
      update: {
        cnpj: dto.cnpj || undefined,
        inscricaoMunicipal: dto.inscricaoMunicipal,
        inscricaoEstadual: dto.inscricaoEstadual,
        regimeTributario: dto.regimeTributario !== undefined ? Number(dto.regimeTributario) : undefined,
        optanteSimples: dto.optanteSimples,
        aliquotaISS: dto.aliquotaISS,
        focusTokenSandbox: dto.focusTokenSandbox,
        focusTokenProd: dto.focusTokenProd,
      },
    });

    // Se o token da Focus estiver presente, tenta registrar a empresa na Focus NFe
    if (config.focusTokenSandbox) {
      try {
        const client = this.getFocusClient(config.focusTokenSandbox);
        
        // Payload para registrar empresa
        const payload = {
          nome: workshop.name,
          nome_fantasia: workshop.name,
          cnpj: config.cnpj.replace(/\D/g, ''),
          inscricao_municipal: config.inscricaoMunicipal || '',
          inscricao_estadual: config.inscricaoEstadual || '',
          regime_tributario: String(config.regimeTributario),
          email: workshop.email || 'oficina@mecanicapro.com.br',
          telefone: (workshop.phone || workshop.whatsapp || '1199999999').replace(/\D/g, ''),
          logradouro: 'Rua Principal da Oficina', // Simplificado para fins de desenvolvimento
          numero: '123',
          bairro: 'Centro',
          municipio: 'São Paulo',
          uf: 'SP',
          cep: '01001000',
        };

        // Criar ou atualizar empresa na Focus
        await client.post('/v2/empresas', payload).catch(err => {
          // Se já existir, ignora erro de duplicidade
          if (err.response?.status !== 422) {
            throw err;
          }
        });
      } catch (err: any) {
        console.error('Erro ao registrar empresa na Focus NFe:', err.response?.data || err.message);
      }
    }

    return config;
  }

  async uploadCertificate(tenantId: string, base64File: string, password?: string) {
    const config = await this.getFiscalConfig(tenantId);
    
    if (!config.focusTokenSandbox) {
      throw new BadRequestException('Configure o Token da Focus NFe antes de enviar o certificado.');
    }

    // Em produção, isso enviaria o arquivo PFX usando FormData para a Focus NFe
    // Endpoint: POST /v2/empresas/{cnpj}/certificado
    try {
      const client = this.getFocusClient(config.focusTokenSandbox);
      const cnpjClean = config.cnpj.replace(/\D/g, '');

      // Simulação para ambiente local de desenvolvimento (mock)
      if (config.focusTokenSandbox === 'sandbox_mock') {
        console.log(`[MOCK] Uploading certificate for CNPJ ${cnpjClean} with password ${password}`);
      } else {
        // Envio real
        await client.post(`/v2/empresas/${cnpjClean}/certificado`, {
          arquivo: base64File,
          senha: password || '',
        });
      }

      return await this.prisma.fiscalConfig.update({
        where: { tenantId },
        data: { hasCertificate: true },
      });
    } catch (err: any) {
      console.error('Erro no upload de certificado na Focus:', err.response?.data || err.message);
      throw new InternalServerErrorException(
        err.response?.data?.mensagem || 'Falha ao processar certificado na API do Focus NFe.'
      );
    }
  }

  async getInvoicesForOS(osId: string) {
    return this.prisma.fiscalInvoice.findMany({
      where: { osId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async emitInvoicesForOS(tenantId: string, osId: string) {
    const os = await this.prisma.workOrder.findUnique({
      where: { id: osId },
      include: {
        client: true,
        services: true,
        parts: true,
        workshop: true,
      },
    });

    if (!os) {
      throw new NotFoundException('Ordem de serviço não encontrada.');
    }

    const config = await this.prisma.fiscalConfig.findUnique({
      where: { tenantId },
    });

    if (!config || !config.focusTokenSandbox) {
      throw new BadRequestException('Dados fiscais ou Token Focus NFe não configurados.');
    }

    const results: any[] = [];

    // 1. EMISSÃO DE NFS-e (Mão de Obra / Serviços)
    if (os.services.length > 0 && parseFloat(os.servicesTotal.toString()) > 0) {
      const focusReference = `NFSE-${osId.substring(0, 8)}-${Date.now().toString().substring(8)}`;
      
      const invoice = await this.prisma.fiscalInvoice.create({
        data: {
          tenantId,
          osId,
          type: 'NFSE',
          status: 'PROCESSANDO',
          focusReference,
        },
      });

      // Disparar requisição asíncrona para Focus NFe
      this.transmitNfse(config, os, invoice, focusReference);
      results.push(invoice);
    }

    // 2. EMISSÃO DE NF-e (Peças / Mercadorias)
    if (os.parts.length > 0 && parseFloat(os.partsTotal.toString()) > 0) {
      const focusReference = `NFE-${osId.substring(0, 8)}-${Date.now().toString().substring(8)}`;

      const invoice = await this.prisma.fiscalInvoice.create({
        data: {
          tenantId,
          osId,
          type: 'NFE',
          status: 'PROCESSANDO',
          focusReference,
        },
      });

      // Disparar requisição asíncrona para Focus NFe
      this.transmitNfe(config, os, invoice, focusReference);
      results.push(invoice);
    }

    return results;
  }

  private async transmitNfse(config: any, os: any, invoice: any, ref: string) {
    try {
      // Mock de emissão rápida caso seja token fictício
      if (config.focusTokenSandbox === 'sandbox_mock') {
        setTimeout(async () => {
          await this.prisma.fiscalInvoice.update({
            where: { id: invoice.id },
            data: {
              status: 'AUTORIZADA',
              invoiceNumber: Math.floor(Math.random() * 1000).toString(),
              pdfUrl: 'https://homologacao.focusnfe.com.br/mock-danfse.pdf',
              xmlUrl: 'https://homologacao.focusnfe.com.br/mock-danfse.xml',
            },
          });
          console.log(`[MOCK] NFS-e successfully authorized for OS ${os.osNumber}`);
        }, 3000);
        return;
      }

      const client = this.getFocusClient(config.focusTokenSandbox);
      
      const payload = {
        data_emissao: new Date().toISOString(),
        prestador: {
          cnpj: config.cnpj.replace(/\D/g, ''),
          inscricao_municipal: config.inscricaoMunicipal || '',
        },
        tomador: {
          cnpj_ou_cpf: (os.client.cpfCnpj || '00000000000').replace(/\D/g, ''),
          razao_social: os.client.name,
          email: os.client.email || undefined,
          telefone: os.client.phone.replace(/\D/g, ''),
          endereco: {
            logradouro: 'Rua do Tomador', // Simplificado
            numero: '123',
            bairro: 'Centro',
            codigo_municipio: '3550308', // Ex: São Paulo - IBGE
            uf: 'SP',
            cep: '01001000',
          },
        },
        servico: {
          aliquota: parseFloat(config.aliquotaISS.toString()) || 2.0,
          codigo_servico: '14.01', // Manutenção e conserto de veículos
          item_lista_servico: '1401',
          valor_servicos: parseFloat(os.servicesTotal.toString()),
          discriminacao: `Serviços mecânicos prestados na OS número ${os.osNumber} - Veículo: ${os.vehicleId.substring(0, 6)}`,
        },
      };

      await client.post(`/v2/nfse?ref=${ref}`, payload);
    } catch (err: any) {
      const errMsg = err.response?.data?.mensagem || err.message;
      await this.prisma.fiscalInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'REJEITADA',
          errorMessage: errMsg,
        },
      });
      console.error(`Erro ao transmitir NFS-e da OS ${os.id}:`, errMsg);
    }
  }

  private async transmitNfe(config: any, os: any, invoice: any, ref: string) {
    try {
      if (config.focusTokenSandbox === 'sandbox_mock') {
        setTimeout(async () => {
          await this.prisma.fiscalInvoice.update({
            where: { id: invoice.id },
            data: {
              status: 'AUTORIZADA',
              invoiceNumber: Math.floor(Math.random() * 1000).toString(),
              accessKey: '35260712345678000199550010000001231000001234',
              pdfUrl: 'https://homologacao.focusnfe.com.br/mock-danfe.pdf',
              xmlUrl: 'https://homologacao.focusnfe.com.br/mock-danfe.xml',
            },
          });
          console.log(`[MOCK] NF-e successfully authorized for OS ${os.osNumber}`);
        }, 4000);
        return;
      }

      const client = this.getFocusClient(config.focusTokenSandbox);
      
      // Payload simplificado da Focus NFe de mercadorias (NF-e modelo 55)
      const payload = {
        natureza_operacao: 'Venda de mercadoria',
        data_emissao: new Date().toISOString(),
        tipo_documento: 1, // Saída
        local_destino: 1, // Operação interna
        regime_tributario: config.regimeTributario,
        emitente: {
          cnpj: config.cnpj.replace(/\D/g, ''),
          inscricao_estadual: config.inscricaoEstadual || '',
        },
        destinatario: {
          cnpj_ou_cpf: (os.client.cpfCnpj || '00000000000').replace(/\D/g, ''),
          nome: os.client.name,
          inscricao_estadual: 'ISENTO',
          endereco: {
            logradouro: 'Rua do Destinatário',
            numero: '123',
            bairro: 'Centro',
            municipio: 'São Paulo',
            uf: 'SP',
            cep: '01001000',
          },
        },
        itens: os.parts.map((p: any, index: number) => ({
          numero_item: index + 1,
          codigo_produto: p.code || `PEC-${p.id.substring(0, 4)}`,
          descricao: p.name,
          cfop: '5102', // Venda de mercadoria adquirida de terceiros (op. interna)
          unidade_comercial: 'UN',
          quantidade_comercial: p.quantity,
          valor_unitario_comercial: parseFloat(p.salePrice.toString()),
          valor_unitario_tributavel: parseFloat(p.salePrice.toString()),
          unidade_tributavel: 'UN',
          quantidade_tributavel: p.quantity,
          ncm: '8708.29.99', // Peças de reposição automotiva genérica
          codigo_barras_gtin: 'SEM GTIN',
          codigo_barras_gtin_tributavel: 'SEM GTIN',
          icms_situacao_tributaria: config.optanteSimples ? '102' : '00', // Simples Nacional CSOSN 102
          icms_origem: 0,
        })),
        valor_frete: 0,
        valor_seguro: 0,
        valor_total_produtos: parseFloat(os.partsTotal.toString()),
        valor_total_nota: parseFloat(os.partsTotal.toString()),
      };

      await client.post(`/v2/nfe?ref=${ref}`, payload);
    } catch (err: any) {
      const errMsg = err.response?.data?.mensagem || err.message;
      await this.prisma.fiscalInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'REJEITADA',
          errorMessage: errMsg,
        },
      });
      console.error(`Erro ao transmitir NF-e da OS ${os.id}:`, errMsg);
    }
  }

  async handleFocusWebhook(body: any) {
    const { ref, status, numero, chave_nfe, caminho_xml_nota_fiscal, caminho_pdf_da_nota_fiscal, mensagem_sefaz } = body;
    
    if (!ref) {
      console.warn('Focus Webhook received without reference');
      return { received: true };
    }

    const invoice = await this.prisma.fiscalInvoice.findUnique({
      where: { focusReference: ref },
    });

    if (!invoice) {
      console.warn(`Focus Webhook received for unknown reference: ${ref}`);
      return { received: true };
    }

    console.log(`Processing Focus NFe Webhook: Ref: ${ref}, Status: ${status}`);

    if (status === 'autorizado') {
      await this.prisma.fiscalInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'AUTORIZADA',
          invoiceNumber: String(numero) || null,
          accessKey: chave_nfe || null,
          pdfUrl: caminho_pdf_da_nota_fiscal || null,
          xmlUrl: caminho_xml_nota_fiscal || null,
          errorMessage: null,
        },
      });
    } else if (status === 'erro' || status === 'rejeitado') {
      await this.prisma.fiscalInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'REJEITADA',
          errorMessage: mensagem_sefaz || 'Erro não detalhado retornado pela prefeitura/SEFAZ.',
        },
      });
    } else if (status === 'cancelado') {
      await this.prisma.fiscalInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'CANCELADA',
        },
      });
    }

    return { received: true };
  }
}
