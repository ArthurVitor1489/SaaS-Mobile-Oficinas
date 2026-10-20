import { Controller, Get, Post, Body, UseGuards, Headers, Req } from '@nestjs/common';
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

  @Get('admin/tenants')
  getAdminWorkshops(
    @Headers('authorization') authHeader?: string,
    @Headers('x-admin-key') masterKey?: string,
  ) {
    return this.subscriptionService.getAdminWorkshops(authHeader, masterKey);
  }

  @Post('admin/grant')
  adminManageSubscription(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-admin-key') masterKey: string | undefined,
    @Body()
    body: {
      tenantId?: string;
      email?: string;
      action: 'LIFETIME' | 'ACTIVE_30D' | 'TRIAL_7D' | 'BLOCK';
    },
  ) {
    return this.subscriptionService.adminManageSubscription(authHeader, masterKey, body);
  }

  @Post('webhook')
  handleWebhook(@Body() body: any) {
    return this.subscriptionService.handleWebhook(body);
  }

  @Post('webhook/revenuecat')
  handleRevenueCatWebhook(
    @Body() body: any,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.subscriptionService.handleRevenueCatWebhook(body, authHeader);
  }
}

