import { Module } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { AssetsImportService } from './assets-import.service';

@Module({
  providers: [AssetsService, AssetsImportService],
  controllers: [AssetsController],
  exports: [AssetsService],
})
export class AssetsModule {}
