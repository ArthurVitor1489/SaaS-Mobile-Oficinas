import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsEnum(['ENTRADA', 'SAIDA'])
  type: 'ENTRADA' | 'SAIDA';

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  description?: string;
}
