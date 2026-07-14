import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsNumber, IsOptional, Min } from 'class-validator';
import { MoolreChannel } from '../../moolre/moolre-channel.enum';

export class FundJobDto {
  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'GHS', default: 'GHS' })
  @IsOptional()
  @IsIn(['GHS'])
  currency?: string;

  @ApiProperty({
    enum: MoolreChannel,
    example: MoolreChannel.Mtn,
    description:
      'Sponsor mobile money channel: 13=MTN, 6=Telecel, 7=AirtelTigo.',
  })
  @IsEnum(MoolreChannel)
  channel: MoolreChannel;
}
