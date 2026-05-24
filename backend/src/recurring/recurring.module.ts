import { Module } from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { RecurringController } from './recurring.controller';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [SlaModule],
  providers: [RecurringService],
  controllers: [RecurringController],
  exports: [RecurringService],
})
export class RecurringModule {}
