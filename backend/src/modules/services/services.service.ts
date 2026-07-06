import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.serviceItem.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const service = await this.prisma.serviceItem.findFirst({
      where: { id, tenantId },
    });
    if (!service) {
      throw new NotFoundException('Serviço não encontrado.');
    }
    return service;
  }

  async create(tenantId: string, dto: CreateServiceDto) {
    return this.prisma.serviceItem.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(tenantId, id);

    return this.prisma.serviceItem.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    await this.prisma.serviceItem.delete({
      where: { id },
    });
    return { success: true };
  }
}
