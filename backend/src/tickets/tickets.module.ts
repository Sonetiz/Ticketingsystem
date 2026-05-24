import { Module, forwardRef } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { SlaModule } from '../sla/sla.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SlaModule, forwardRef(() => AuthModule)],
  providers: [TicketsService],
  controllers: [TicketsController],
  exports: [TicketsService],
})
export class TicketsModule {}
