import { Module, forwardRef } from '@nestjs/common';
import { CsatService } from './csat.service';
import { CsatController } from './csat.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  providers: [CsatService],
  controllers: [CsatController],
  exports: [CsatService],
})
export class CsatModule {}
