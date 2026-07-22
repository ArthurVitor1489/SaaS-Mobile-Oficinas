import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { FiscalService } from './fiscal.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';

@Controller('fiscal')
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard)
  getFiscalConfig(@Tenant() tenantId: string) {
    return this.fiscalService.getFiscalConfig(tenantId);
  }

  @Post('config')
  @UseGuards(JwtAuthGuard)
  saveFiscalConfig(@Tenant() tenantId: string, @Body() body: any) {
    return this.fiscalService.saveFiscalConfig(tenantId, body);
  }

  @Post('certificate')
  @UseGuards(JwtAuthGuard)
  uploadCertificate(@Tenant() tenantId: string, @Body() body: { base64File: string; password?: string }) {
    return this.fiscalService.uploadCertificate(tenantId, body.base64File, body.password);
  }

  @Get('invoices/:osId')
  @UseGuards(JwtAuthGuard)
  getInvoicesForOS(@Param('osId') osId: string) {
    return this.fiscalService.getInvoicesForOS(osId);
  }

  @Post('invoice/emit/:osId')
  @UseGuards(JwtAuthGuard)
  emitInvoicesForOS(@Tenant() tenantId: string, @Param('osId') osId: string) {
    return this.fiscalService.emitInvoicesForOS(tenantId, osId);
  }

  @Post('webhook/focus')
  handleFocusWebhook(@Body() body: any) {
    return this.fiscalService.handleFocusWebhook(body);
  }
}
