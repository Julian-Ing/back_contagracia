import { IsString, IsNotEmpty } from 'class-validator';

export class RejectStorageTransferDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de rechazo es requerido' })
  rejection_reason: string;
}
