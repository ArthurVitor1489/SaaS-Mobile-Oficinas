import { Controller, Get, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  getSubscription(@Tenant() tenantId: string) {
    return this.subscriptionService.getSubscription(tenantId);
  }
}
