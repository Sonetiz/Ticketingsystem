import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../rbac/rbac.module';
import { AuthModule } from '../auth/auth.module';
import { SlaModule } from '../sla/sla.module';
import { RecurringModule } from '../recurring/recurring.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { WorkerScheduler } from './worker.scheduler';

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 30_000 },
  removeOnComplete: 1000,
  removeOnFail: false,
};

const queueNames = [
  'email.poll',
  'email.process_inbound',
  'email.send_outbound',
  'teams.notify',
  'recurring.scan',
  'sla.evaluate',
  'hold.release',
  'notify.deliver',
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    }),
    BullModule.registerQueue(
      ...queueNames.map((name) => ({ name, defaultJobOptions })),
    ),
    PrismaModule,
    AuditModule,
    RbacModule,
    AuthModule,
    SlaModule,
    RecurringModule,
    IntegrationsModule,
    NotificationsModule,
    AttachmentsModule,
  ],
  providers: [WorkerScheduler],
})
export class WorkerModule {}
