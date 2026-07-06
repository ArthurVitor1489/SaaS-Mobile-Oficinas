import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';

@Controller('services')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll(@Tenant() tenantId: string) {
    return this.servicesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.servicesService.findOne(tenantId, id);
  }

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(tenantId, dto);
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.servicesService.remove(tenantId, id);
  }
}
