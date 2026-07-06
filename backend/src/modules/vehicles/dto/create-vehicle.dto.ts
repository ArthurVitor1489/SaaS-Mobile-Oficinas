import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateVehicleDto {
  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  plate: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  year: string;

  @IsString()
  @IsOptional()
  chassis?: string;

  @IsString()
  @IsOptional()
  odometer?: string;
}
