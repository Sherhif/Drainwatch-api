import { Module } from '@nestjs/common';
import { MoolreModule } from '../moolre/moolre.module';
import { UsersModule } from '../users/users.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [MoolreModule, UsersModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
