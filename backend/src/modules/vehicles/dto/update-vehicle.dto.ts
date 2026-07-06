import { IsOptional, IsString } from 'class-validator';

export class UpdateVehicleDto {
  @IsString()
  @IsOptional()
  plate?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  year?: string;

  @IsString()
  @IsOptional()
  chassis?: string;

  @IsString()
  @IsOptional()
  odometer?: string;
}
