import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req) => {
          const requestId =
            (req.headers['x-request-id'] as string) ||
            (req.headers['x-correlation-id'] as string) ||
            randomUUID();
          cls.set('requestId', requestId);
        },
      },
    }),
  ],
})
export class CorrelationModule {}
