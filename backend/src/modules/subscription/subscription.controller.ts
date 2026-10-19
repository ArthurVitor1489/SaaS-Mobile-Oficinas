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
  @UseGuards(JwtAuthGuard)
  getAdminWorkshops(
    @Req() req: any,
    @Headers('x-admin-key') masterKey?: string,
  ) {
    return this.subscriptionService.getAdminWorkshops(req.user?.email, masterKey);
  }

  @Post('admin/grant')
  @UseGuards(JwtAuthGuard)
  adminManageSubscription(
    @Req() req: any,
    @Headers('x-admin-key') masterKey: string | undefined,
    @Body()
    body: {
      tenantId?: string;
      email?: string;
      action: 'LIFETIME' | 'ACTIVE_30D' | 'TRIAL_7D' | 'BLOCK';
    },
  ) {
    return this.subscriptionService.adminManageSubscription(req.user?.email, masterKey, body);
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

