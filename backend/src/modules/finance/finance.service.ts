import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllBillings(tenantId: string) {
    return this.prisma.billing.findMany({
      where: { tenantId },
      include: {
        workOrder: {
          include: { client: true, vehicle: true },
        },
        installments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async payInstallment(tenantId: string, billingId: string, installmentNumber: number) {
    const billing = await this.prisma.billing.findFirst({
      where: { id: billingId, tenantId },
      include: { installments: true, workOrder: true },
    });

    if (!billing) {
      throw new NotFoundException('Cobrança não encontrada.');
    }

    const installment = billing.installments.find((i) => i.number === installmentNumber);
    if (!installment) {
      throw new NotFoundException('Parcela não encontrada.');
    }

    if (installment.status === 'PAGO') {
      throw new BadRequestException('Esta parcela já está paga.');
    }

    const paidAt = new Date();
    const todayStr = paidAt.toISOString().split('T')[0];

    return this.prisma.$transaction(async (tx) => {
      await tx.billingInstallment.update({
        where: { id: installment.id },
        data: {
          status: 'PAGO',
          paidAt,
        },
      });

      const updatedInstallments = await tx.billingInstallment.findMany({
        where: { billingId },
      });
      const totalPaid = updatedInstallments.filter((i) => i.status === 'PAGO').length;
      
      let newStatus: 'PAGO' | 'PENDENTE' | 'PARCIALMENTE_PAGO' = 'PENDENTE';
      if (totalPaid === updatedInstallments.length) {
        newStatus = 'PAGO';
      } else if (totalPaid > 0) {
        newStatus = 'PARCIALMENTE_PAGO';
      }

      await tx.billing.update({
        where: { id: billingId },
        data: { status: newStatus },
      });

      const description = `Parcela ${installmentNumber}/${updatedInstallments.length} da ${billing.workOrder.osNumber}`;
      await tx.financialTransaction.create({
        data: {
          tenantId,
          type: 'ENTRADA',
          category: 'Pagamento OS',
          amount: installment.amount,
          date: todayStr,
          description,
        },
      });

      return tx.billing.findUnique({
        where: { id: billingId },
        include: { installments: true, workOrder: true },
      });
    });
  }

  async findAllTransactions(tenantId: string) {
    return this.prisma.financialTransaction.findMany({
      where: { tenantId },
      orderBy: { date: 'desc' },
    });
  }

  async createTransaction(tenantId: string, dto: CreateTransactionDto) {
    return this.prisma.financialTransaction.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async removeTransaction(tenantId: string, id: string) {
    const trans = await this.prisma.financialTransaction.findFirst({
      where: { id, tenantId },
    });
    if (!trans) {
      throw new NotFoundException('Lançamento financeiro não encontrado.');
    }

    await this.prisma.financialTransaction.delete({
      where: { id },
    });
    return { success: true };
  }
}
