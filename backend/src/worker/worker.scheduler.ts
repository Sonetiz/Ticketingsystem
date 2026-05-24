import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlaService } from '../sla/sla.service';
import { RecurringService } from '../recurring/recurring.service';
import { EmailDispatchService } from '../integrations/email/email-dispatch.service';

@Injectable()
export class WorkerScheduler {
  private readonly logger = new Logger(WorkerScheduler.name);

  constructor(
    private readonly sla: SlaService,
    private readonly recurring: RecurringService,
    private readonly emailDispatch: EmailDispatchService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateSla() {
    this.logger.debug('Running SLA evaluation');
    await this.sla.evaluateAllTickets();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseHolds() {
    this.logger.debug('Checking hold releases');
    await this.sla.releaseExpiredHolds();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scanRecurring() {
    this.logger.debug('Scanning recurring tasks');
    await this.recurring.scanAndGenerate();
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollEmail() {
    if (process.env.EMAIL_CONNECTOR === 'mock') return;
    this.logger.debug('Polling email');
    await this.emailDispatch.pollInbound();
  }
}
