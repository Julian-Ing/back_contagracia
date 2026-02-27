import { IsString, IsOptional, IsNotEmpty, IsBoolean, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/* ── Item ────────────────────────────────────────────── */

export class CreateDocumentItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  product_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2' })
  @IsString()
  @IsNotEmpty()
  quantity: string;

  @ApiProperty({ example: '50000' })
  @IsString()
  @IsNotEmpty()
  unit_price: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  tax_included: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  is_discount_rate: boolean;

  @ApiProperty({ example: '0' })
  @IsString()
  discount_input: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tax_id?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  tax_rate?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storage_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cost_center_id?: string;
}

/* ── Payment line ────────────────────────────────────── */

export class CreateDocumentPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  company_payment_method_id: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bank_account_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  prepayment_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cost_center_id?: string;

  @ApiProperty({ example: '100000' })
  @IsString()
  @IsNotEmpty()
  amount: string;
}

/* ── Withholding ─────────────────────────────────────── */

export class CreateDocumentWithholdingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  withholding_id: string;

  @ApiProperty({ example: 3.5 })
  @IsNumber()
  @Type(() => Number)
  rate: number;

  @ApiProperty({ example: '35000' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cost_center_id?: string;
}

/* ── AIU ─────────────────────────────────────────────── */

export class CreateDocumentAiuDto {
  @ApiProperty({ example: '5' })
  @IsString()
  administrative_percentage: string;

  @ApiProperty({ example: '100000' })
  @IsString()
  administrative: string;

  @ApiProperty({ example: '3' })
  @IsString()
  unexpected_percentage: string;

  @ApiProperty({ example: '60000' })
  @IsString()
  unexpected: string;

  @ApiProperty({ example: '10' })
  @IsString()
  utility_percentage: string;

  @ApiProperty({ example: '200000' })
  @IsString()
  utility: string;
}

/* ── Credit config ───────────────────────────────────── */

export class CreateDocumentCreditDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  due_date: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payment_method_id: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cost_center_id?: string;
}

/* ── Main DTO ────────────────────────────────────────── */

export class CreateDocumentDto {
  @ApiProperty({ enum: ['INVOICE'], example: 'INVOICE' })
  @IsString()
  @IsNotEmpty()
  doc_type: string;

  @ApiProperty({ enum: ['DRAFT', 'PENDING'], example: 'DRAFT' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  third_party_id: string;

  @ApiProperty({ example: '2026-02-26' })
  @IsString()
  @IsNotEmpty()
  doc_date: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type_operation_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  purchase_order_consecutive?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  purchase_order_date?: string;

  /* ── Totals (computed by frontend, validated by backend) ── */

  @ApiProperty({ example: '1000000' })
  @IsString()
  subtotal: string;

  @ApiProperty({ example: '50000' })
  @IsString()
  total_discounts: string;

  @ApiProperty({ example: '190000' })
  @IsString()
  total_taxes: string;

  @ApiProperty({ example: '35000' })
  @IsString()
  total_withholdings: string;

  @ApiProperty({ example: '1155000' })
  @IsString()
  net_amount: string;

  @ApiPropertyOptional()
  @IsOptional()
  tax_details?: any;

  @ApiPropertyOptional()
  @IsOptional()
  withholding_details?: any;

  /* ── Children ── */

  @ApiProperty({ type: [CreateDocumentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentItemDto)
  items: CreateDocumentItemDto[];

  @ApiPropertyOptional({ type: [CreateDocumentPaymentDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentPaymentDto)
  payments?: CreateDocumentPaymentDto[];

  @ApiPropertyOptional({ type: [CreateDocumentWithholdingDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentWithholdingDto)
  withholdings?: CreateDocumentWithholdingDto[];

  @ApiPropertyOptional({ type: CreateDocumentAiuDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDocumentAiuDto)
  aiu?: CreateDocumentAiuDto;

  @ApiPropertyOptional({ type: CreateDocumentCreditDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDocumentCreditDto)
  credit?: CreateDocumentCreditDto;
}
