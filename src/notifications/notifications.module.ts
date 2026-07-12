import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoolreModule } from '../moolre/moolre.module';
import { UsersModule } from '../users/users.module';
import { SmsLogEntity } from './entities/sms-log.entity';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [MoolreModule, TypeOrmModule.forFeature([SmsLogEntity]), UsersModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
