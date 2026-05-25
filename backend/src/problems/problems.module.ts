import { Module } from '@nestjs/common';
import { ProblemsService } from './problems.service';
import { ProblemsController } from './problems.controller';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [AssetsModule],
  providers: [ProblemsService],
  controllers: [ProblemsController],
  exports: [ProblemsService],
})
export class ProblemsModule {}
