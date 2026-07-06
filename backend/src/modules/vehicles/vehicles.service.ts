import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.vehicle.findMany({
      where: {
        tenantId,
      },
      include: { client: true },
      orderBy: { model: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        tenantId,
      },
      include: { client: true },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }
    return vehicle;
  }

  async create(tenantId: string, dto: CreateVehicleDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new BadRequestException('Cliente associado não pertence a esta oficina.');
    }

    return this.prisma.vehicle.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        plate: dto.plate.toUpperCase(),
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        chassis: dto.chassis || null,
        odometer: dto.odometer || '0',
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateVehicleDto) {
    await this.findOne(tenantId, id);

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        ...dto,
        plate: dto.plate ? dto.plate.toUpperCase() : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    await this.prisma.vehicle.delete({
      where: { id },
    });
    return { success: true };
  }
}
