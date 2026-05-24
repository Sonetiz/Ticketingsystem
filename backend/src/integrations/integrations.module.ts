import { Module, forwardRef } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { EmailDispatchService } from './email/email-dispatch.service';
import {
  MockEmailConnector,
  ImapEmailConnector,
  GraphEmailConnector,
} from './email/email.connectors';
import {
  MockTeamsConnector,
  GraphTeamsConnector,
  TeamsDispatchService,
} from './teams/teams.connectors';
import { TicketsModule } from '../tickets/tickets.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [forwardRef(() => TicketsModule), MessagesModule],
  controllers: [IntegrationsController],
  providers: [
    EmailDispatchService,
    MockEmailConnector,
    ImapEmailConnector,
    GraphEmailConnector,
    MockTeamsConnector,
    GraphTeamsConnector,
    TeamsDispatchService,
  ],
  exports: [EmailDispatchService, TeamsDispatchService, MockEmailConnector],
})
export class IntegrationsModule {}
