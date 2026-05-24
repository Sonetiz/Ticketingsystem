import { Module } from '@nestjs/common';
import { WorklogService } from './worklog.service';
import { WorklogController } from './worklog.controller';

@Module({
  providers: [WorklogService],
  controllers: [WorklogController],
  exports: [WorklogService],
})
export class WorklogModule {}
