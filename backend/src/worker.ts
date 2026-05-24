import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker/worker.module';
import { initSentry } from './common/sentry';

async function bootstrap() {
  initSentry('worker');

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.get(Logger).log('Background worker started');
}

bootstrap();
