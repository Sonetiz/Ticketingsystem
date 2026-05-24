import { Module, forwardRef } from '@nestjs/common';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';
import { BusinessHoursEngine } from './business-hours.engine';
import { SlaRuleResolver } from './sla-rule.resolver';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  providers: [SlaService, BusinessHoursEngine, SlaRuleResolver],
  controllers: [SlaController],
  exports: [SlaService, SlaRuleResolver, BusinessHoursEngine],
})
export class SlaModule {}
