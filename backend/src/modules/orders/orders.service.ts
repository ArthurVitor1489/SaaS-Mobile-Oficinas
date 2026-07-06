import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.workOrder.findMany({
      where: { tenantId },
      include: {
        client: true,
        vehicle: true,
        services: true,
        parts: true,
        billing: {
          include: { installments: true },
        },
      },
      orderBy: { osNumber: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const order = await this.prisma.workOrder.findFirst({
      where: { id, tenantId },
      include: {
        client: true,
        vehicle: true,
        services: true,
        parts: true,
        billing: {
          include: { installments: true },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Ordem de Serviço não encontrada.');
    }
    return order;
  }

  async create(tenantId: string, dto: CreateOrderDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new BadRequestException('Cliente não encontrado.');
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, tenantId },
    });
    if (!vehicle) {
      throw new BadRequestException('Veículo não encontrado.');
    }

    const servicesTotal = dto.services.reduce((acc, s) => acc + s.price * s.quantity, 0);
    const partsTotal = dto.parts.reduce((acc, p) => acc + p.salePrice * p.quantity, 0);
    const grandTotal = servicesTotal + partsTotal;

    return this.prisma.$transaction(async (tx) => {
      const workshop = await tx.workshop.findUnique({
        where: { id: tenantId },
      });
      if (!workshop) {
        throw new NotFoundException('Oficina não encontrada.');
      }

      const currentNext = workshop.nextOSNumber;
      const osNumber = `OS-${String(currentNext).padStart(4, '0')}`;

      await tx.workshop.update({
        where: { id: tenantId },
        data: { nextOSNumber: currentNext + 1 },
      });

      const workOrder = await tx.workOrder.create({
        data: {
          tenantId,
          osNumber,
          date: dto.date,
          clientId: dto.clientId,
          vehicleId: dto.vehicleId,
          notes: dto.notes || null,
          status: dto.status,
          servicesTotal,
          partsTotal,
          grandTotal,
          signature: dto.signature || null,
        },
      });

      if (dto.services.length > 0) {
        await tx.workOrderService.createMany({
          data: dto.services.map((s) => ({
            osId: workOrder.id,
            name: s.name,
            price: s.price,
            quantity: s.quantity,
          })),
        });
      }

      for (const p of dto.parts) {
        await tx.workOrderPart.create({
          data: {
            osId: workOrder.id,
            name: p.name,
            code: p.code || null,
            salePrice: p.salePrice,
            quantity: p.quantity,
          },
        });

        const catalogPart = await tx.partItem.findFirst({
          where: {
            tenantId,
            OR: [
              p.code ? { code: p.code } : undefined,
              { name: p.name },
            ].filter(Boolean) as any,
          },
        });

        if (catalogPart) {
          const newStock = Math.max(0, catalogPart.stock - p.quantity);
          await tx.partItem.update({
            where: { id: catalogPart.id },
            data: { stock: newStock },
          });
        }
      }

      if (dto.status === 'CONCLUIDA' || dto.status === 'ENTREGUE') {
        const todayStr = new Date().toISOString().split('T')[0];
        
        await tx.billing.create({
          data: {
            tenantId,
            osId: workOrder.id,
            amount: grandTotal,
            paymentMethod: 'PIX',
            status: 'PENDENTE',
            dueDate: todayStr,
            installments: {
              create: [
                {
                  number: 1,
                  amount: grandTotal,
                  dueDate: todayStr,
                  status: 'PENDENTE',
                },
              ],
            },
          },
        });
      }

      return tx.workOrder.findUnique({
        where: { id: workOrder.id },
        include: { services: true, parts: true, billing: true },
      });
    });
  }

  async update(tenantId: string, id: string, dto: UpdateOrderDto) {
    const original = await this.findOne(tenantId, id);

    const services = dto.services ?? original.services;
    const parts = dto.parts ?? original.parts;

    const servicesTotal = services.reduce((acc, s) => acc + Number(s.price) * s.quantity, 0);
    const partsTotal = parts.reduce((acc, p) => acc + Number(p.salePrice) * p.quantity, 0);
    const grandTotal = servicesTotal + partsTotal;

    return this.prisma.$transaction(async (tx) => {
      if (dto.services) {
        await tx.workOrderService.deleteMany({ where: { osId: id } });
        if (dto.services.length > 0) {
          await tx.workOrderService.createMany({
            data: dto.services.map((s) => ({
              osId: id,
              name: s.name,
              price: s.price,
              quantity: s.quantity,
            })),
          });
        }
      }

      if (dto.parts) {
        await tx.workOrderPart.deleteMany({ where: { osId: id } });
        if (dto.parts.length > 0) {
          await tx.workOrderPart.createMany({
            data: dto.parts.map((p) => ({
              osId: id,
              name: p.name,
              code: p.code || null,
              salePrice: p.salePrice,
              quantity: p.quantity,
            })),
          });
        }
      }

      await tx.workOrder.update({
        where: { id },
        data: {
          notes: dto.notes,
          status: dto.status,
          servicesTotal,
          partsTotal,
          grandTotal,
          signature: dto.signature,
        },
      });

      if (dto.status && (dto.status === 'CONCLUIDA' || dto.status === 'ENTREGUE')) {
        const existingBilling = await tx.billing.findUnique({ where: { osId: id } });
        if (!existingBilling) {
          const todayStr = new Date().toISOString().split('T')[0];
          await tx.billing.create({
            data: {
              tenantId,
              osId: id,
              amount: grandTotal,
              paymentMethod: 'PIX',
              status: 'PENDENTE',
              dueDate: todayStr,
              installments: {
                create: [
                  {
                    number: 1,
                    amount: grandTotal,
                    dueDate: todayStr,
                    status: 'PENDENTE',
                  },
                ],
              },
            },
          });
        }
      }

      return tx.workOrder.findUnique({
        where: { id },
        include: { services: true, parts: true, billing: true },
      });
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.$transaction(async (tx) => {
      await tx.workOrderService.deleteMany({ where: { osId: id } });
      await tx.workOrderPart.deleteMany({ where: { osId: id } });
      await tx.billing.deleteMany({ where: { osId: id } });
      await tx.workOrder.delete({ where: { id } });
      return { success: true };
    });
  }
}
