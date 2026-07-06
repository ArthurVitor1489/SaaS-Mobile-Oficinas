import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';

@Injectable()
export class PartsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.partItem.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const part = await this.prisma.partItem.findFirst({
      where: { id, tenantId },
    });
    if (!part) {
      throw new NotFoundException('Peça não encontrada.');
    }
    return part;
  }

  async create(tenantId: string, dto: CreatePartDto) {
    return this.prisma.partItem.create({
      data: {
        tenantId,
        ...dto,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdatePartDto) {
    await this.findOne(tenantId, id);

    return this.prisma.partItem.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    await this.prisma.partItem.delete({
      where: { id },
    });
    return { success: true };
  }
}
