import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { ClientsModule } from './modules/clients/clients.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { ServicesModule } from './modules/services/services.module';
import { PartsModule } from './modules/parts/parts.module';
import { OrdersModule } from './modules/orders/orders.module';
import { FinanceModule } from './modules/finance/finance.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantModule,
    ClientsModule,
    VehiclesModule,
    ServicesModule,
    PartsModule,
    OrdersModule,
    FinanceModule,
    SubscriptionModule,
    FiscalModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
