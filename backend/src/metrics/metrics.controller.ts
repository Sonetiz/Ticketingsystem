import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { register, collectDefaultMetrics, Counter, Gauge } from 'prom-client';

collectDefaultMetrics({ register });

export const ticketsOpenGauge = new Gauge({
  name: 'tickets_open_total',
  help: 'Number of open tickets',
  registers: [register],
});

export const slaBreachCounter = new Counter({
  name: 'sla_breach_total',
  help: 'Total SLA breaches',
  registers: [register],
});

export const notificationsSentCounter = new Counter({
  name: 'notifications_sent_total',
  help: 'Notifications sent by channel',
  labelNames: ['channel'],
  registers: [register],
});

@Controller('metrics')
export class MetricsController {
  @Get()
  async index(@Res() res: Response) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}
