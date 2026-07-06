import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { Tenant } from '../../common/decorators/tenant.decorator';

@Controller('tenant')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('settings')
  getSettings(@Tenant() tenantId: string) {
    return this.tenantService.getSettings(tenantId);
  }

  @Patch('settings')
  updateSettings(
    @Tenant() tenantId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.tenantService.updateSettings(tenantId, dto);
  }
}
