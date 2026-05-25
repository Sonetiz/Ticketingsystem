import { Module } from '@nestjs/common';
import { SoftwareService } from './software.service';
import { SoftwareController } from './software.controller';

@Module({
  providers: [SoftwareService],
  controllers: [SoftwareController],
  exports: [SoftwareService],
})
export class SoftwareModule {}
