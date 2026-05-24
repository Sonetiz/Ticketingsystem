import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addHours, isWeekend, setHours, setMinutes, startOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export interface DaySchedule {
  open: string;
  close: string;
}

export type WeeklySchedule = Record<string, DaySchedule[]>;

@Injectable()
export class BusinessHoursEngine {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultSchedule(): Promise<{ schedule: WeeklySchedule; timezone: string; holidays: Date[] }> {
    const bh = await this.prisma.businessHours.findFirst({ where: { isDefault: true } });
    const holidays = await this.prisma.holiday.findMany();
    const schedule = (bh?.schedule as unknown as WeeklySchedule) || this.defaultSchedule();
    return {
      schedule,
      timezone: bh?.timezone || 'UTC',
      holidays: holidays.map((h) => h.date),
    };
  }

  defaultSchedule(): WeeklySchedule {
    const weekday: DaySchedule[] = [{ open: '09:00', close: '17:00' }];
    return {
      monday: weekday,
      tuesday: weekday,
      wednesday: weekday,
      thursday: weekday,
      friday: weekday,
      saturday: [],
      sunday: [],
    };
  }

  async addBusinessHours(start: Date, hours: number): Promise<Date> {
    const { schedule, timezone, holidays } = await this.getDefaultSchedule();
    let remainingMs = hours * 60 * 60 * 1000;
    let cursor = new Date(start);

    while (remainingMs > 0) {
      const zoned = toZonedTime(cursor, timezone);
      if (this.isHoliday(zoned, holidays) || isWeekend(zoned)) {
        cursor = this.nextDayStart(zoned, timezone);
        continue;
      }
      const dayKey = this.dayKey(zoned);
      const slots = schedule[dayKey] || [];
      if (!slots.length) {
        cursor = this.nextDayStart(zoned, timezone);
        continue;
      }
      for (const slot of slots) {
        const [openH, openM] = slot.open.split(':').map(Number);
        const [closeH, closeM] = slot.close.split(':').map(Number);
        const open = fromZonedTime(setMinutes(setHours(startOfDay(zoned), openH), openM), timezone);
        const close = fromZonedTime(setMinutes(setHours(startOfDay(zoned), closeH), closeM), timezone);
        if (cursor >= close) continue;
        const effectiveStart = cursor > open ? cursor : open;
        const available = close.getTime() - effectiveStart.getTime();
        if (available <= 0) continue;
        if (remainingMs <= available) {
          return new Date(effectiveStart.getTime() + remainingMs);
        }
        remainingMs -= available;
        cursor = close;
      }
      cursor = this.nextDayStart(zoned, timezone);
    }
    return cursor;
  }

  private isHoliday(date: Date, holidays: Date[]): boolean {
    const d = startOfDay(date).getTime();
    return holidays.some((h) => startOfDay(h).getTime() === d);
  }

  private dayKey(date: Date): string {
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  }

  private nextDayStart(zoned: Date, timezone: string): Date {
    const next = addHours(startOfDay(zoned), 24);
    return fromZonedTime(next, timezone);
  }
}
