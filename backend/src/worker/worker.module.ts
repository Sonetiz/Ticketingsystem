import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { SlaModule } from '../sla/sla.module';
import { RecurringModule } from '../recurring/recurring.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkerScheduler } from './worker.scheduler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
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
      { name: 'email.poll' },
      { name: 'email.process_inbound' },
      { name: 'email.send_outbound' },
      { name: 'teams.notify' },
      { name: 'recurring.scan' },
      { name: 'sla.evaluate' },
      { name: 'hold.release' },
      { name: 'notify.deliver' },
    ),
    PrismaModule,
    AuditModule,
    SlaModule,
    RecurringModule,
    IntegrationsModule,
    NotificationsModule,
  ],
  providers: [WorkerScheduler],
})
export class WorkerModule {}
