import { Module } from '@nestjs/common';
import { ChangesService } from './changes.service';
import { ChangesController } from './changes.controller';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [AssetsModule],
  providers: [ChangesService],
  controllers: [ChangesController],
  exports: [ChangesService],
})
export class ChangesModule {}
