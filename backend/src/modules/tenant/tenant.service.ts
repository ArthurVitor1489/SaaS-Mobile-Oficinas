import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });
    if (!workshop) {
      throw new NotFoundException('Oficina não encontrada.');
    }
    return workshop;
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto) {
    return this.prisma.workshop.update({
      where: { id: tenantId },
      data: dto,
    });
  }

  async deleteAccount(tenantId: string) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { id: tenantId },
    });
    if (!workshop) {
      throw new NotFoundException('Oficina não encontrada.');
    }
    await this.prisma.workshop.delete({
      where: { id: tenantId },
    });
    return { success: true, message: 'Conta e todos os dados associados foram excluídos com sucesso.' };
  }
}
