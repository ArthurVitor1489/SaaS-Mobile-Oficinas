import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePartDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchasePrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePrice: number;

  @IsInt()
  @Min(0)
  stock: number;
}
