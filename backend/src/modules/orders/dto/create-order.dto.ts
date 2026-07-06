import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderServiceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class OrderPartDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePrice: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  status: 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'ENTREGUE' | 'CANCELADA';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderServiceDto)
  services: OrderServiceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderPartDto)
  parts: OrderPartDto[];

  @IsString()
  @IsOptional()
  signature?: string;
}
