import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderServiceDto, OrderPartDto } from './create-order.dto';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'ENTREGUE' | 'CANCELADA';

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderServiceDto)
  services?: OrderServiceDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderPartDto)
  parts?: OrderPartDto[];

  @IsString()
  @IsOptional()
  signature?: string;
}
