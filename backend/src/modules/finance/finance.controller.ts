import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateBillingDto } from './dto/create-billing.dto';
import { UpdateInstallmentDueDateDto } from './dto/update-installment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('billings')
  findAllBillings(@Tenant() tenantId: string) {
    return this.financeService.findAllBillings(tenantId);
  }

  @Post('billings')
  createBilling(
    @Tenant() tenantId: string,
    @Body() dto: CreateBillingDto,
  ) {
    return this.financeService.createBilling(tenantId, dto);
  }

  @Patch('billings/:id/installments/:number')
  updateInstallmentDueDate(
    @Tenant() tenantId: string,
    @Param('id') billingId: string,
    @Param('number', ParseIntPipe) installmentNumber: number,
    @Body() dto: UpdateInstallmentDueDateDto,
  ) {
    return this.financeService.updateInstallmentDueDate(tenantId, billingId, installmentNumber, dto);
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
