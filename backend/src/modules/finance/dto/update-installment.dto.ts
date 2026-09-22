import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class UpdateInstallmentDueDateDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate deve estar no formato AAAA-MM-DD (ex: 2026-10-15)' })
  dueDate: string;
}
