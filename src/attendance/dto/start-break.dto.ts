import { IsEnum } from 'class-validator';
import { BreakType } from '@prisma/client';

export class StartBreakDto {
  @IsEnum(BreakType)
  type: BreakType;
}
