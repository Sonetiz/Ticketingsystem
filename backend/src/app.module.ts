import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { CorrelationModule } from './common/correlation/correlation.module';
import { RealtimeModule } from './common/realtime/realtime.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { SearchModule } from './search/search.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { AssetsModule } from './assets/assets.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { CatalogModule } from './catalog/catalog.module';
import { SavedViewsModule } from './saved-views/saved-views.module';
import { CsatModule } from './csat/csat.module';
import { WorklogModule } from './worklog/worklog.module';
import { ChangesModule } from './changes/changes.module';
import { ProblemsModule } from './problems/problems.module';
import { SoftwareModule } from './software/software.module';
import { AccessAllowlistMiddleware } from './common/access-allowlist.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CorrelationModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) ||
          (req.headers['x-correlation-id'] as string) ||
          crypto.randomUUID(),
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
    RealtimeModule,
    HealthModule,
    MetricsModule,
    SearchModule,
    KnowledgeBaseModule,
    AssetsModule,
    ApprovalsModule,
    CatalogModule,
    SavedViewsModule,
    CsatModule,
    WorklogModule,
    ChangesModule,
    ProblemsModule,
    SoftwareModule,
  ],
  providers: [AccessAllowlistMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AccessAllowlistMiddleware).forRoutes('*');
  }
}
