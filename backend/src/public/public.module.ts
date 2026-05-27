import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { AuthModule } from '../auth/auth.module';
import { MessagesModule } from '../messages/messages.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [AuthModule, MessagesModule, AttachmentsModule, TicketsModule],
  providers: [PublicService],
  controllers: [PublicController],
})
export class PublicModule {}
