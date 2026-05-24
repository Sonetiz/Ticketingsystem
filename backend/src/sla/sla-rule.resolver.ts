import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessHoursEngine } from './business-hours.engine';

@Injectable()
export class SlaRuleResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessHours: BusinessHoursEngine,
  ) {}

  async resolveTarget(params: {
    priority: string;
    categoryId?: string | null;
    serviceId?: string | null;
    createdAt: Date;
  }): Promise<{ resolutionAt: Date; responseAt: Date }> {
    const rules = await this.prisma.slaRule.findMany({ where: { isActive: true } });
    const rule = this.pickRule(rules, params.priority, params.categoryId, params.serviceId);
    const resolutionMinutes = rule?.resolutionMinutes ?? this.defaultResolutionMinutes(params.priority);
    const responseMinutes = rule?.responseMinutes ?? Math.min(resolutionMinutes, 60);
    const resolutionHours = resolutionMinutes / 60;
    const responseHours = responseMinutes / 60;
    const [resolutionAt, responseAt] = await Promise.all([
      this.businessHours.addBusinessHours(params.createdAt, resolutionHours),
      this.businessHours.addBusinessHours(params.createdAt, responseHours),
    ]);
    return { resolutionAt, responseAt };
  }

  private pickRule(
    rules: Array<{
      priority: string | null;
      categoryId: string | null;
      serviceId: string | null;
      resolutionMinutes: number | null;
      responseMinutes: number | null;
    }>,
    priority: string,
    categoryId?: string | null,
    serviceId?: string | null,
  ) {
    const scored = rules
      .filter((r) => !r.priority || r.priority === priority)
      .filter((r) => !r.categoryId || r.categoryId === categoryId)
      .filter((r) => !r.serviceId || r.serviceId === serviceId)
      .map((r) => ({
        rule: r,
        score:
          (r.serviceId ? 4 : 0) +
          (r.categoryId ? 2 : 0) +
          (r.priority ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score);
    return scored[0]?.rule;
  }

  private defaultResolutionMinutes(priority: string): number {
    const map: Record<string, number> = {
      critical: 240,
      urgent: 480,
      high: 1440,
      elevated: 2880,
      normal: 4320,
    };
    return map[priority] ?? 4320;
  }
}
