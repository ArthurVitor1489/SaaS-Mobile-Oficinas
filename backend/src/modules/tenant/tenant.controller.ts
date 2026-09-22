import { Controller, Get, Patch, Delete, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';

@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('settings')
  @UseGuards(SubscriptionGuard)
  getSettings(@Tenant() tenantId: string) {
    return this.tenantService.getSettings(tenantId);
  }

  @Patch('settings')
  @UseGuards(SubscriptionGuard)
  updateSettings(
    @Tenant() tenantId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.tenantService.updateSettings(tenantId, dto);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  deleteAccount(@Tenant() tenantId: string) {
    return this.tenantService.deleteAccount(tenantId);
  }
}
