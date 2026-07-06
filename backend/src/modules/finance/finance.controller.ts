import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('billings')
  findAllBillings(@Tenant() tenantId: string) {
    return this.financeService.findAllBillings(tenantId);
  }

  @Post('billings/:id/pay')
  @HttpCode(HttpStatus.OK)
  payInstallment(
    @Tenant() tenantId: string,
    @Param('id') billingId: string,
    @Body('installmentNumber') installmentNumber: number,
  ) {
    return this.financeService.payInstallment(tenantId, billingId, installmentNumber);
  }

  @Get('transactions')
  findAllTransactions(@Tenant() tenantId: string) {
    return this.financeService.findAllTransactions(tenantId);
  }

  @Post('transactions')
  createTransaction(
    @Tenant() tenantId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.financeService.createTransaction(tenantId, dto);
  }

  @Delete('transactions/:id')
  removeTransaction(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.financeService.removeTransaction(tenantId, id);
  }
}
