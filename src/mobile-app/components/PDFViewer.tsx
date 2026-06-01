import React from 'react';
import { Printer, Share2, MessageSquare, Mail, X, FileText } from 'lucide-react';
import { WorkOrder, Client, Vehicle, CompanySettings } from '../context/DatabaseContext';

interface PDFViewerProps {
  os: WorkOrder;
  client: Client;
  vehicle: Vehicle;
  settings: CompanySettings;
  onClose: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ os, client, vehicle, settings, onClose }) => {
  
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    return dateStr.split('-').reverse().join('/');
  };

  const buildInvoiceHTML = () => {
    const codePart = os.parts.map(p => `
      <tr>
        <td style="font-weight: 500; text-transform: uppercase;">${p.name.toUpperCase()} ${p.code ? `(Ref. ${p.code})` : ''}</td>
        <td class="center-col" style="font-weight: 600;">${p.quantity}</td>
        <td class="right-col">${formatCurrency(p.salePrice)}</td>
        <td class="right-col" style="font-weight: 700;">${formatCurrency(p.salePrice * p.quantity)}</td>
      </tr>
    `).join('');

    const codeService = os.services.map(s => `
      <tr>
        <td style="font-weight: 500; text-transform: uppercase;">${s.name.toUpperCase()} ${s.code ? `(Ref. ${s.code})` : ''}</td>
        <td class="center-col" style="font-weight: 600;">${s.quantity || 1}</td>
        <td class="right-col">${formatCurrency(s.price)}</td>
        <td class="right-col" style="font-weight: 700;">${formatCurrency(s.price * (s.quantity || 1))}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Ordem de Servico ${os.osNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            line-height: 1.4;
            padding: 0;
            width: calc(100% - 8px);
            margin: 0 auto;
            background: #ffffff;
            font-size: 11px;
            box-sizing: border-box;
          }
          .header-grid {
            display: grid;
            grid-template-columns: 7fr 3fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .border-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            padding: 12px;
            background: #ffffff;
            box-sizing: border-box;
          }
          .company-title {
            font-size: 15px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 8px;
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 4px;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .company-text {
            font-size: 9.5px;
            font-weight: 500;
            margin-bottom: 3px;
            color: #0f172a;
          }
          .center-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .os-tag {
            border: 1.5px solid #0f172a;
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 6px;
            color: #0f172a;
          }
          .os-num {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .os-meta {
            font-size: 9.5px;
            color: #334155;
            font-weight: 500;
            margin-top: 1px;
          }
          .section-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            margin-bottom: 12px;
            box-sizing: border-box;
            background: #ffffff;
            overflow: hidden;
          }
          .section-title {
            background: #f8fafc;
            border-bottom: 1.5px solid #0f172a;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .section-content {
            padding: 10px;
          }
          .customer-grid {
            display: grid;
            grid-template-columns: 38fr 34fr 28fr;
            gap: 10px;
            font-size: 10px;
          }
          .customer-row {
            margin-bottom: 4px;
          }
          .customer-label {
            font-weight: 700;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 8px 12px;
            font-size: 10px;
            border-right: 1.5px solid #0f172a;
            border-bottom: 1.5px solid #0f172a;
            box-sizing: border-box;
            color: #0f172a;
          }
          th {
            background: #ffffff;
            color: #0f172a;
            font-weight: 800;
            text-transform: uppercase;
            text-align: left;
          }
          th:last-child, td:last-child {
            border-right: none;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .center-col {
            text-align: center;
          }
          .right-col {
            text-align: right;
          }
          .totals-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 12px;
          }
          .total-card {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            padding: 10px;
            box-sizing: border-box;
            background: #ffffff;
          }
          .total-card-label {
            font-size: 8px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .total-card-value {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
          }
          .bottom-row {
            display: grid;
            grid-template-columns: 3fr 2fr;
            gap: 12px;
            margin-bottom: 25px;
          }
          .obs-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            min-height: 85px;
            box-sizing: border-box;
            padding: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .obs-title {
            background: #f8fafc;
            border-bottom: 1.5px solid #0f172a;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .obs-content {
            padding: 10px;
            font-size: 10px;
            line-height: 1.4;
            white-space: pre-wrap;
            color: #0f172a;
          }
          .grand-total-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            text-align: center;
            box-sizing: border-box;
            padding: 10px;
          }
          .grand-total-title {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            color: #64748b;
          }
          .grand-total-price {
            font-size: 26px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .signature-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 40px;
            margin-bottom: 20px;
          }
          .sig-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            text-align: center;
          }
          .sig-line {
            width: 100%;
            border-top: 1.5px solid #0f172a;
            margin-top: 4px;
            padding-top: 4px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
          }
          .sig-img {
            max-height: 45px;
            object-fit: contain;
            margin-bottom: 4px;
          }
          .print-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8px;
            font-weight: 700;
            border-top: 1.5px solid #0f172a;
            padding-top: 8px;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 20px;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-grid">
          <div class="border-box">
            <div class="company-title">${settings.name.toUpperCase()}</div>
            <div class="company-text"><strong>CNPJ:</strong> ${settings.cnpj}</div>
            <div class="company-text"><strong>TEL:</strong> ${settings.phone} / ${settings.whatsapp}</div>
            <div class="company-text"><strong>END:</strong> ${settings.address.toUpperCase()}</div>
          </div>
          
          <div class="border-box center-box">
            <div class="os-tag">Ordem de Serviço</div>
            <div class="os-num">${os.osNumber}</div>
            <div class="os-meta"><strong>Data:</strong> ${formatDate(os.date)}</div>
            <div class="os-meta" style="text-transform: uppercase;"><strong>Status:</strong> ${os.status}</div>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Dados do Cliente e Veículo</div>
          <div class="section-content">
            <div class="customer-grid">
              <div>
                <div class="customer-row"><span class="customer-label">Cliente:</span> ${client.name.toUpperCase()}</div>
                <div class="customer-row"><span class="customer-label">Placa:</span> ${vehicle.plate.toUpperCase()}</div>
              </div>
              <div>
                <div class="customer-row"><span class="customer-label">Telefone:</span> ${client.phone || '-'}</div>
                <div class="customer-row"><span class="customer-label">Endereço:</span> ${client.address.toUpperCase()}</div>
              </div>
              <div>
                <div class="customer-row"><span class="customer-label">Veículo:</span> ${vehicle.brand.toUpperCase()} ${vehicle.model.toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>

        ${os.parts.length > 0 ? `
          <div class="section-box">
            <div class="section-title">Peças Utilizadas</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 55%;">Peça</th>
                  <th style="width: 10%; text-align: center;">Qtd</th>
                  <th style="width: 15%; text-align: right;">Valor Unit.</th>
                  <th style="width: 20%; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${codePart}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${os.services.length > 0 ? `
          <div class="section-box">
            <div class="section-title">Serviços Executados</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 55%;">Serviço</th>
                  <th style="width: 10%; text-align: center;">Qtd</th>
                  <th style="width: 15%; text-align: right;">Valor Unit.</th>
                  <th style="width: 20%; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${codeService}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="totals-row">
          <div class="total-card">
            <div class="total-card-label">Total Peças</div>
            <div class="total-card-value">${formatCurrency(os.partsTotal)}</div>
          </div>
          <div class="total-card">
            <div class="total-card-label">Total Serviços</div>
            <div class="total-card-value">${formatCurrency(os.servicesTotal)}</div>
          </div>
          <div class="total-card">
            <div class="total-card-label">Subtotal</div>
            <div class="total-card-value">${formatCurrency(os.grandTotal)}</div>
          </div>
          <div class="total-card">
            <div class="total-card-label">Desconto</div>
            <div class="total-card-value">-R$ 0,00</div>
          </div>
        </div>

        <div class="bottom-row">
          <div class="obs-box">
            <div class="obs-title">Observações</div>
            <div class="obs-content">${os.notes || '-'}</div>
          </div>
          
          <div class="grand-total-box">
            <div class="grand-total-title">Total da Ordem de Serviço</div>
            <div class="grand-total-price">${formatCurrency(os.grandTotal)}</div>
          </div>
        </div>

        <div class="signature-row">
          <div class="sig-container">
            <div style="height: 45px; display: flex; align-items: flex-end;">
              ${os.signature ? `<img class="sig-img" src="${os.signature}" alt="Assinatura">` : ''}
            </div>
            <div class="sig-line">Assinatura do Cliente</div>
          </div>
          <div class="sig-container">
            <div style="height: 45px;"></div>
            <div class="sig-line">Responsável pela Oficina</div>
          </div>
        </div>

        <div class="print-footer">
          <div>Documento Interno da Oficina</div>
          <div>${os.osNumber}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    // Generate isolated printer popup window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Por favor, autorize pop-ups para gerar o documento!');
    
    printWindow.document.write(buildInvoiceHTML());
    printWindow.document.close();
  };

  const getWhatsAppLink = () => {
    const text = encodeURIComponent(
      `Olá, *${client.name}*!\n\nAqui é da *${settings.name}*.\n\nSua Ordem de Serviço *${os.osNumber}* para o veículo *${vehicle.brand} ${vehicle.model} (${vehicle.plate})* foi finalizada com sucesso! ✅\n\n*Resumo dos Valores:*\nServiços: ${formatCurrency(os.servicesTotal)}\nPeças: ${formatCurrency(os.partsTotal)}\n💰 *Valor Total: ${formatCurrency(os.grandTotal)}*\n\nEstamos enviando a via digital da ordem em anexo. Entre em contato para agendar a retirada! 👍`
    );
    // Remove characters from phone string to pass to URL
    const cleanPhone = client.whatsapp.replace(/\D/g, '');
    const prefix = cleanPhone.startsWith('55') ? '' : '55';
    return `https://api.whatsapp.com/send?phone=${prefix}${cleanPhone}&text=${text}`;
  };

  const getEmailLink = () => {
    const subject = encodeURIComponent(`Ordem de Serviço ${os.osNumber} - ${settings.name}`);
    const body = encodeURIComponent(
      `Olá, ${client.name},\n\nEspero que esteja bem.\n\nA Ordem de Serviço ${os.osNumber} do seu veículo ${vehicle.brand} ${vehicle.model} (Placa: ${vehicle.plate}) na oficina ${settings.name} foi finalizada.\n\nValor Total: ${formatCurrency(os.grandTotal)}\nServiços realizados: ${formatCurrency(os.servicesTotal)}\nPeças aplicadas: ${formatCurrency(os.partsTotal)}\n\nAnexamos os detalhes deste atendimento para sua conferência.\n\nAtenciosamente,\nEquipe ${settings.name}\n${settings.phone}`
    );
    return `mailto:${client.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-4 phone-screen animate-fade-in">
      <div className="flex flex-col bg-dark-900 border border-dark-800 w-full rounded-t-3xl max-h-[90vh] overflow-hidden shadow-glass animate-slide-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-800 bg-dark-950">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-brand-500" />
            <span className="font-semibold text-slate-200 text-sm">Visualizar Recibo (PDF)</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-100 text-slate-900 select-text">
          <div className="bg-white border border-slate-300 rounded-xl p-4 shadow-sm text-[8px] space-y-3 font-sans">
            
            {/* Header Box Grid */}
            <div className="grid grid-cols-5 gap-1.5">
              <div className="col-span-3 border border-slate-900 p-2 rounded">
                <div className="font-extrabold text-[9px] text-slate-950 uppercase border-b border-slate-950 pb-1 mb-1 truncate">{settings.name}</div>
                <div className="text-[7px] text-slate-600">CNPJ: {settings.cnpj}</div>
                <div className="text-[7px] text-slate-600 truncate">TEL: {settings.phone}</div>
                <div className="text-[7px] text-slate-600 truncate">END: {settings.address}</div>
              </div>
              <div className="col-span-2 border border-slate-900 p-2 rounded flex flex-col items-center justify-center text-center">
                <span className="text-[6px] border border-slate-900 px-1 py-0.25 font-bold uppercase rounded-2xs">Ordem de Serviço</span>
                <span className="font-black text-xs text-slate-900 mt-1">{os.osNumber}</span>
                <span className="text-[6px] text-slate-500 mt-1">Data: {formatDate(os.date)}</span>
                <span className="text-[6px] text-slate-500 mt-1">Status: {os.status}</span>
              </div>
            </div>

            {/* Customer & Vehicle */}
            <div className="border border-slate-900 rounded overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-900 px-2 py-1 font-extrabold text-[8px] uppercase tracking-wide">Dados do Cliente e Veículo</div>
              <div className="p-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[7px] text-slate-700">
                <div className="truncate"><span className="font-bold text-slate-950">Cliente:</span> {client.name}</div>
                <div className="truncate"><span className="font-bold text-slate-950">Endereço:</span> {client.address}</div>
                <div><span className="font-bold text-slate-950">Placa:</span> {vehicle.plate}</div>
                <div><span className="font-bold text-slate-950">Veículo:</span> {vehicle.brand} {vehicle.model}</div>
              </div>
            </div>

            {/* Services Table */}
            {os.services.length > 0 && (
              <div className="border border-slate-900 rounded overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-900 px-2 py-1 font-extrabold text-[8px] uppercase tracking-wide">Serviços Executados</div>
                <table className="w-full text-left text-[7px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-900 text-[6px] font-bold text-slate-700">
                      <th className="p-1 border-r border-slate-900">Serviço</th>
                      <th className="p-1 border-r border-slate-900 text-center">Qtd</th>
                      <th className="p-1 border-r border-slate-900 text-right">Unit</th>
                      <th className="p-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {os.services.map(s => (
                      <tr key={s.id}>
                        <td className="p-1 border-r border-slate-900 font-medium text-slate-900">
                          {s.name} {s.code ? `(Ref. ${s.code})` : ''}
                        </td>
                        <td className="p-1 border-r border-slate-900 text-center text-slate-600">{s.quantity || 1}</td>
                        <td className="p-1 border-r border-slate-900 text-right text-slate-600">{formatCurrency(s.price)}</td>
                        <td className="p-1 text-right font-semibold text-slate-900">{formatCurrency(s.price * (s.quantity || 1))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Parts Table */}
            {os.parts.length > 0 && (
              <div className="border border-slate-900 rounded overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-900 px-2 py-1 font-extrabold text-[8px] uppercase tracking-wide">Peças Utilizadas</div>
                <table className="w-full text-left text-[7px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-900 text-[6px] font-bold text-slate-700">
                      <th className="p-1 border-r border-slate-900">Peça</th>
                      <th className="p-1 border-r border-slate-900 text-center">Qtd</th>
                      <th className="p-1 border-r border-slate-900 text-right">Unit</th>
                      <th className="p-1 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {os.parts.map(p => (
                      <tr key={p.id}>
                        <td className="p-1 border-r border-slate-900 font-medium text-slate-900">
                          {p.name} {p.code ? `(Ref. ${p.code})` : ''}
                        </td>
                        <td className="p-1 border-r border-slate-900 text-center text-slate-600">{p.quantity}</td>
                        <td className="p-1 border-r border-slate-900 text-right text-slate-600">{formatCurrency(p.salePrice)}</td>
                        <td className="p-1 text-right font-semibold text-slate-900">{formatCurrency(p.salePrice * p.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals Grid */}
            <div className="grid grid-cols-4 gap-1">
              <div className="border border-slate-900 p-1 rounded text-center">
                <span className="text-[5px] text-slate-500 uppercase font-bold block">Peças</span>
                <span className="font-extrabold text-[8px] text-slate-900">{formatCurrency(os.partsTotal)}</span>
              </div>
              <div className="border border-slate-900 p-1 rounded text-center">
                <span className="text-[5px] text-slate-500 uppercase font-bold block">Serviços</span>
                <span className="font-extrabold text-[8px] text-slate-900">{formatCurrency(os.servicesTotal)}</span>
              </div>
              <div className="border border-slate-900 p-1 rounded text-center">
                <span className="text-[5px] text-slate-500 uppercase font-bold block">Subtotal</span>
                <span className="font-extrabold text-[8px] text-slate-900">{formatCurrency(os.grandTotal)}</span>
              </div>
              <div className="border border-slate-900 p-1 rounded text-center bg-slate-50">
                <span className="text-[5px] text-slate-500 uppercase font-bold block">Desconto</span>
                <span className="font-extrabold text-[8px] text-slate-900">-R$ 0,00</span>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-5 gap-1.5">
              <div className="col-span-3 border border-slate-900 p-1.5 rounded min-h-12 flex flex-col justify-between">
                <span className="text-[5px] text-slate-500 uppercase font-extrabold border-b border-slate-200 pb-0.5 mb-1 block">Observações</span>
                <span className="text-[6px] text-slate-700 italic leading-snug line-clamp-2">{os.notes || '-'}</span>
              </div>
              <div className="col-span-2 border border-slate-900 p-1.5 rounded flex flex-col items-center justify-center text-center bg-slate-50">
                <span className="text-[5px] text-slate-600 uppercase font-bold">Total da Ordem de Serviço</span>
                <span className="font-black text-sm text-slate-950 mt-1">{formatCurrency(os.grandTotal)}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col items-center text-center justify-end">
                {os.signature ? (
                  <img src={os.signature} alt="Signature" className="h-6 object-contain mb-1" />
                ) : (
                  <div className="h-6"></div>
                )}
                <div className="w-full border-t border-slate-900 pt-0.5 text-[5px] font-bold uppercase text-slate-500">Assinatura do Cliente</div>
              </div>
              <div className="flex flex-col items-center text-center justify-end">
                <div className="h-6"></div>
                <div className="w-full border-t border-slate-900 pt-0.5 text-[5px] font-bold uppercase text-slate-500">Responsável pela Oficina</div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-dark-800 bg-dark-950 space-y-3">
          
          <button
            onClick={handlePrint}
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-premium transition-all active:scale-98"
          >
            <Printer size={15} />
            Gerar PDF / Imprimir OS
          </button>

          <div className="flex items-center gap-2">
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98"
            >
              <MessageSquare size={14} />
              WhatsApp
            </a>
            <a
              href={getEmailLink()}
              className="flex-1 py-2 bg-dark-800 hover:bg-dark-700 text-slate-200 border border-dark-700 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98"
            >
              <Mail size={14} />
              Enviar E-mail
            </a>
          </div>
          
          <button
            onClick={onClose}
            className="w-full py-2 text-dark-400 hover:text-slate-200 text-xs font-semibold"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
};
