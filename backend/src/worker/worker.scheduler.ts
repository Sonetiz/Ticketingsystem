import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SlaService } from '../sla/sla.service';
import { RecurringService } from '../recurring/recurring.service';
import { EmailDispatchService } from '../integrations/email/email-dispatch.service';
import { AttachmentsService } from '../attachments/attachments.service';

@Injectable()
export class WorkerScheduler {
  private readonly logger = new Logger(WorkerScheduler.name);

  constructor(
    private readonly sla: SlaService,
    private readonly recurring: RecurringService,
    private readonly emailDispatch: EmailDispatchService,
    private readonly attachments: AttachmentsService,
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

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async attachmentsRetention() {
    const retentionDays = Number(process.env.ATTACHMENT_RETENTION_DAYS || 365);
    this.logger.log(`Running attachment retention (>${retentionDays} days)`);
    const deleted = await this.attachments.purgeExpiredAttachments(retentionDays);
    this.logger.log(`Purged ${deleted} expired attachments`);
  }
}
