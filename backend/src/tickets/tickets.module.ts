import { Module, forwardRef } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { SlaModule } from '../sla/sla.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../common/realtime/realtime.module';
import { CsatModule } from '../csat/csat.module';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [
    forwardRef(() => SlaModule),
    forwardRef(() => AuthModule),
    forwardRef(() => NotificationsModule),
    RealtimeModule,
    forwardRef(() => CsatModule),
    AssetsModule,
  ],
  providers: [TicketsService],
  controllers: [TicketsController],
  exports: [TicketsService],
})
export class TicketsModule {}
