import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class ToggleReactionDto {
  @ApiProperty({
    description: 'Tipo de reacción',
    enum: ['like', 'dislike'],
  })
  @IsString()
  @IsIn(['like', 'dislike'])
  reaction_type: string;

  @ApiProperty({ description: 'ID del visitante anónimo' })
  @IsString()
  visitor_id: string;
}
