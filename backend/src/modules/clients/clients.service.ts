import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.client.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId },
      include: { vehicles: true },
    });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return client;
  }

  async create(tenantId: string, dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(tenantId, id);

    return this.prisma.client.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    await this.prisma.client.delete({
      where: { id },
    });
    return { success: true };
  }
}
