import { IsString, IsNotEmpty, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class InstallmentItemDto {
  @IsNumber()
  @IsNotEmpty()
  number: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  dueDate: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  paidAt?: string;
}

export class CreateBillingDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  osId?: string;

  @IsString()
  @IsOptional()
  customClientName?: string;

  @IsString()
  @IsOptional()
  customDescription?: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsNotEmpty()
  dueDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstallmentItemDto)
  installments: InstallmentItemDto[];
}
