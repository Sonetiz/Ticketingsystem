import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { TicketsModule } from './tickets/tickets.module';
import { MessagesModule } from './messages/messages.module';
import { ProjectsModule } from './projects/projects.module';
import { RecurringModule } from './recurring/recurring.module';
import { SlaModule } from './sla/sla.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { ManagementModule } from './management/management.module';
import { PublicModule } from './public/public.module';
import { ExtrasModule } from './extras/extras.module';
import { AuditModule } from './audit/audit.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { LookupsModule } from './lookups/lookups.module';

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
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    RbacModule,
    AuthModule,
    TicketsModule,
    MessagesModule,
    AttachmentsModule,
    ProjectsModule,
    RecurringModule,
    SlaModule,
    IntegrationsModule,
    NotificationsModule,
    ReportsModule,
    ManagementModule,
    PublicModule,
    ExtrasModule,
    LookupsModule,
  ],
})
export class AppModule {}
