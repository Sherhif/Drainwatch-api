import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { MoolreChannel } from '../../moolre/moolre-channel.enum';

export class UpdateProfileDto {
  @ApiProperty({
    enum: MoolreChannel,
    example: MoolreChannel.Mtn,
    description: 'Moolre payout channel: 13=MTN, 6=Telecel, 7=AirtelTigo.',
  })
  @IsEnum(MoolreChannel)
  moolre_channel: MoolreChannel;
}
