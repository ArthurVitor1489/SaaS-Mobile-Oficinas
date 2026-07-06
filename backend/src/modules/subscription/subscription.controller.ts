import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getSubscription(@Tenant() tenantId: string) {
    return this.subscriptionService.getSubscription(tenantId);
  }

  @Post('webhook')
  handleWebhook(@Body() body: any) {
    return this.subscriptionService.handleWebhook(body);
  }
}
