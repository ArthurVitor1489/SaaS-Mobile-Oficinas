import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateBillingDto } from './dto/create-billing.dto';
import { UpdateInstallmentDueDateDto } from './dto/update-installment.dto';

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
        installments: {
          orderBy: { number: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBilling(tenantId: string, dto: CreateBillingDto) {
    // Check if workOrder exists
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: dto.osId, tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException('Ordem de serviço associada não encontrada.');
    }

    // Check if billing already exists for this OS
    const existing = await this.prisma.billing.findFirst({
      where: { osId: dto.osId, tenantId },
      include: { installments: true, workOrder: true },
    });

    if (existing) {
      return existing;
    }

    // Compute status
    const allPaid = dto.installments.every((i) => i.status === 'PAGO' || i.status === 'Pago');
    const anyPaid = dto.installments.some((i) => i.status === 'PAGO' || i.status === 'Pago');
    const billingStatus = allPaid ? 'PAGO' : anyPaid ? 'PARCIALMENTE_PAGO' : (dto.status || 'PENDENTE');

    return this.prisma.billing.create({
      data: {
        tenantId,
        osId: dto.osId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        status: billingStatus,
        dueDate: dto.dueDate,
        installments: {
          create: dto.installments.map((inst) => ({
            number: inst.number,
            amount: inst.amount,
            dueDate: inst.dueDate,
            status: (inst.status === 'Pago' || inst.status === 'PAGO') ? 'PAGO' : 'PENDENTE',
            paidAt: (inst.status === 'Pago' || inst.status === 'PAGO') ? (inst.paidAt ? new Date(inst.paidAt) : new Date()) : null,
          })),
        },
      },
      include: {
        workOrder: {
          include: { client: true, vehicle: true },
        },
        installments: {
          orderBy: { number: 'asc' },
        },
      },
    });
  }

  async updateInstallmentDueDate(tenantId: string, billingId: string, installmentNumber: number, dto: UpdateInstallmentDueDateDto) {
    const billing = await this.prisma.billing.findFirst({
      where: { id: billingId, tenantId },
      include: { installments: true },
    });

    if (!billing) {
      throw new NotFoundException('Cobrança não encontrada.');
    }

    const installment = billing.installments.find((i) => i.number === installmentNumber);
    if (!installment) {
      throw new NotFoundException(`Parcela/Boleto número ${installmentNumber} não encontrado.`);
    }

    // Update the installment due date
    await this.prisma.billingInstallment.update({
      where: { id: installment.id },
      data: { dueDate: dto.dueDate },
    });

    // If it's the first installment, also update the main billing dueDate
    if (installmentNumber === 1) {
      await this.prisma.billing.update({
        where: { id: billingId },
        data: { dueDate: dto.dueDate },
      });
    }

    return this.prisma.billing.findUnique({
      where: { id: billingId },
      include: {
        workOrder: {
          include: { client: true, vehicle: true },
        },
        installments: {
          orderBy: { number: 'asc' },
        },
      },
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
