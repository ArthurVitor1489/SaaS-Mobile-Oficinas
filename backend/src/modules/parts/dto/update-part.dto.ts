import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePartDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  purchasePrice?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  salePrice?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  stock?: number;
}
