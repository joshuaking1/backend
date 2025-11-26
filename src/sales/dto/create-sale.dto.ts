// src/sales/dto/create-sale.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

class SaleItemDto {
  @IsEnum(['SERVICE', 'INVENTORY'])
  type: 'SERVICE' | 'INVENTORY';

  @IsString()
  @IsNotEmpty()
  itemId: string; // ID of the service or inventory item

  @IsNumber()
  @Min(1)
  quantity: number;
}

class PaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsString()
  @IsOptional()
  transactionId?: string;
}

export class CreateSaleDto {
  @IsString()
  @IsNotEmpty()
  customerUserId: string;

  @IsString()
  @IsOptional()
  appointmentId?: string;
  
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  taxRate?: number; // e.g., 0.15 for 15%

  @IsString()
  @IsOptional()
  notes?: string;
}