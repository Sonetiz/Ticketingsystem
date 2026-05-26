import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';
import ipaddr from 'ipaddr.js';
import { PrismaService } from '../prisma/prisma.service';

type AllowlistSettingValue = {
  enabled?: boolean;
  ips?: string[];
  hosts?: string[];
};

@Injectable()
export class AccessAllowlistMiddleware implements NestMiddleware {
  private cache: { expiresAt: number; value: AllowlistSettingValue | null } = {
    expiresAt: 0,
    value: null,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Always keep health endpoints available.
    if (req.path === '/health' || req.path === '/ready' || req.path === '/live') return next();

    const envIps = this.parseCsv(this.config.get<string>('ACCESS_ALLOWLIST_IPS'));
    const envHosts = this.parseCsv(this.config.get<string>('ACCESS_ALLOWLIST_HOSTS')).map((h) =>
      h.toLowerCase(),
    );

    const setting = await this.getSetting();
    const enabled = setting?.enabled === true;
    if (!enabled) return next();

    const dbIps = (setting?.ips || []).filter(Boolean);
    const dbHosts = (setting?.hosts || []).filter(Boolean).map((h) => h.toLowerCase());

    const ips = [...new Set([...envIps, ...dbIps])];
    const hosts = [...new Set([...envHosts, ...dbHosts])];

    // Safety default: if enabled but no entries are configured, allow all.
    if (!ips.length && !hosts.length) return next();

    const hostHeader = (req.headers.host || '').split(':')[0].toLowerCase();
    const ip = this.getClientIp(req);

    const hostAllowed = hosts.length ? hosts.includes(hostHeader) : false;
    const ipAllowed = ips.length ? this.isIpAllowed(ip, ips) : false;

    // Union behavior: if any configured list matches, allow.
    if ((hosts.length && hostAllowed) || (ips.length && ipAllowed)) return next();

    res.status(403).json({ message: 'Access denied' });
  }

  private parseCsv(value: string | undefined | null): string[] {
    if (!value) return [];
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private getClientIp(req: Request): string {
    const raw = (req.ip || '').trim();
    // Express can return IPv6-mapped IPv4 like ::ffff:1.2.3.4
    return raw.startsWith('::ffff:') ? raw.slice('::ffff:'.length) : raw;
  }

  private isIpAllowed(clientIp: string, allowlist: string[]): boolean {
    try {
      if (!clientIp) return false;
      const addr = ipaddr.parse(clientIp);

      for (const entry of allowlist) {
        try {
          if (entry.includes('/')) {
            const [range, prefix] = ipaddr.parseCIDR(entry);
            if (addr.kind() === range.kind() && addr.match([range, prefix])) return true;
          } else {
            const allowed = ipaddr.parse(entry);
            if (addr.kind() === allowed.kind() && addr.toNormalizedString() === allowed.toNormalizedString()) {
              return true;
            }
          }
        } catch {
          // Ignore invalid entries
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async getSetting(): Promise<AllowlistSettingValue | null> {
    const now = Date.now();
    if (this.cache.value && this.cache.expiresAt > now) return this.cache.value;

    const record = await this.prisma.systemSetting.findUnique({
      where: { key: 'access.allowlist' },
    });
    const value = (record?.value as AllowlistSettingValue | undefined) ?? null;
    this.cache = { value, expiresAt: now + 30_000 };
    return value;
  }
}

