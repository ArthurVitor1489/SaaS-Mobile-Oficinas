import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Tenant() tenantId: string) {
    return this.ordersService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.ordersService.findOne(tenantId, id);
  }

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(tenantId, dto);
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.ordersService.remove(tenantId, id);
  }
}
