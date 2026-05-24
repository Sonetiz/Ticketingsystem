import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'ldapts';

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get('LDAP_ENABLED') === 'true';
  }

  buildBindDn(identifier: string): string {
    const template = this.config.get<string>('LDAP_BIND_DN_TEMPLATE') || '{email}';
    const username = identifier.includes('@') ? identifier.split('@')[0] : identifier;
    return template.replace(/\{email\}/g, identifier).replace(/\{username\}/g, username);
  }

  async bind(identifier: string, password: string): Promise<boolean> {
    if (!this.isEnabled()) {
      this.logger.warn('LDAP bind attempted but LDAP_ENABLED is false');
      return false;
    }

    const url = this.config.get<string>('LDAP_URL');
    if (!url) {
      this.logger.error('LDAP_URL is not configured');
      return false;
    }

    const dn = this.buildBindDn(identifier.toLowerCase());
    const timeoutMs = parseInt(this.config.get<string>('LDAP_TIMEOUT_MS') || '5000', 10);
    const rejectUnauthorized = this.config.get('LDAP_TLS_REJECT_UNAUTHORIZED') !== 'false';

    const client = new Client({
      url,
      timeout: timeoutMs,
      connectTimeout: timeoutMs,
      tlsOptions: url.startsWith('ldaps://') ? { rejectUnauthorized } : undefined,
    });

    try {
      await client.bind(dn, password);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('invalid credentials') || message.includes('49')) {
        return false;
      }
      this.logger.error(`LDAP bind transport error for ${identifier}: ${message}`);
      throw err;
    } finally {
      try {
        await client.unbind();
      } catch {
        // ignore unbind errors
      }
    }
  }
}
