import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { AsaasService } from './asaas.service';

@Module({
  controllers: [SubscriptionController],
  providers: [SubscriptionService, AsaasService],
  exports: [SubscriptionService, AsaasService],
})
export class SubscriptionModule {}
