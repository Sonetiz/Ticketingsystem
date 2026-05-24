import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RbacService } from '../rbac/rbac.service';
import { AuditService } from '../audit/audit.service';
import { SessionUser } from '@ticketsystem/shared';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const MAGIC_LINK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface EntraClaims {
  oid: string;
  email: string;
  name?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  isSsoEnabled(): boolean {
    return this.config.get('SSO_ENABLED') === 'true';
  }

  getAuthConfig() {
    return { ssoEnabled: this.isSsoEnabled() };
  }

  getMicrosoftAuthUrl(returnTo: string): string {
    const tenantId = this.config.get<string>('AZURE_AD_TENANT_ID');
    const clientId = this.config.get<string>('AZURE_AD_CLIENT_ID');
    const redirectUri = this.config.get<string>('AZURE_AD_REDIRECT_URI');
    if (!tenantId || !clientId || !redirectUri) {
      throw new BadRequestException('Microsoft SSO is not configured');
    }
    const state = Buffer.from(JSON.stringify({ returnTo, nonce: randomBytes(8).toString('hex') })).toString('base64url');
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: 'openid profile email',
      state,
    });
    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async handleMicrosoftCallback(code: string): Promise<{ user: SessionUser; csrfToken: string; returnTo: string }> {
    const tenantId = this.config.get<string>('AZURE_AD_TENANT_ID');
    const clientId = this.config.get<string>('AZURE_AD_CLIENT_ID');
    const clientSecret = this.config.get<string>('AZURE_AD_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('AZURE_AD_REDIRECT_URI');
    if (!tenantId || !clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Microsoft SSO is not configured');
    }

    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: 'openid profile email',
        }),
      },
    );

    if (!tokenRes.ok) {
      throw new UnauthorizedException('Failed to exchange authorization code');
    }

    const tokenData = (await tokenRes.json()) as { id_token?: string };
    if (!tokenData.id_token) {
      throw new UnauthorizedException('No ID token received');
    }

    const claims = this.decodeIdToken(tokenData.id_token);
    const user = await this.loginViaEntra(claims);
    return { user, csrfToken: '', returnTo: '/portal' };
  }

  decodeIdToken(idToken: string): EntraClaims {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid ID token');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, string>;
    const oid = payload.oid || payload.sub;
    const email = (payload.email || payload.preferred_username || payload.upn)?.toLowerCase();
    if (!oid || !email) throw new UnauthorizedException('Missing required claims in ID token');
    return { oid, email, name: payload.name };
  }

  async loginViaEntra(claims: EntraClaims): Promise<SessionUser> {
    let user = await this.prisma.user.findFirst({
      where: { entraOid: claims.oid, deletedAt: null },
    });

    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { email: claims.email, deletedAt: null },
      });
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { entraOid: claims.oid, authProvider: 'entra', name: claims.name ?? user.name },
        });
      }
    }

    if (!user) {
      throw new ForbiddenException(
        'No account found. Contact your administrator to be provisioned before using SSO.',
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive');
    }

    await this.audit.log({
      actorId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: 'sso_login',
      source: 'web',
    });

    const sessionUser = await this.rbac.buildSessionUser(user.id);
    if (!sessionUser) throw new UnauthorizedException();
    return sessionUser;
  }

  parseOAuthState(state: string): { returnTo: string } {
    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as { returnTo?: string };
      const returnTo = parsed.returnTo || '/portal';
      if (!returnTo.startsWith('/')) return { returnTo: '/portal' };
      return { returnTo };
    } catch {
      return { returnTo: '/portal' };
    }
  }

  async validateUser(email: string, password: string): Promise<SessionUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    if (!user || !user.passwordHash || !user.isActive) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    return this.rbac.buildSessionUser(user.id);
  }

  async createSession(userId: string) {
    const token = randomBytes(32).toString('hex');
    const csrfToken = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await this.prisma.session.create({
      data: { userId, token, csrfToken, expiresAt },
    });
    return { token, csrfToken, expiresAt };
  }

  async getSessionUser(token: string): Promise<SessionUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { token },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session) await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }
    return this.rbac.buildSessionUser(session.userId);
  }

  async getSessionCsrf(token: string): Promise<string | null> {
    const session = await this.prisma.session.findUnique({ where: { token } });
    return session?.csrfToken ?? null;
  }

  async destroySession(token: string) {
    await this.prisma.session.deleteMany({ where: { token } });
  }

  async validateApiToken(bearerToken: string): Promise<SessionUser | null> {
    const tokenHash = createHash('sha256').update(bearerToken).digest('hex');
    const apiToken = await this.prisma.apiToken.findUnique({
      where: { tokenHash },
    });
    if (!apiToken) return null;
    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) return null;
    await this.prisma.apiToken.update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    });
    return this.rbac.buildSessionUser(apiToken.userId);
  }

  async createMagicLink(ticketId: string, userId?: string) {
    const token = randomBytes(32).toString('hex');
    const signedToken = this.signMagicToken(token);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_DURATION_MS);
    await this.prisma.magicLink.create({
      data: {
        ticketId,
        userId: userId ?? null,
        token: signedToken,
        expiresAt,
      },
    });
    return signedToken;
  }

  signMagicToken(token: string): string {
    const secret = this.config.get<string>('MAGIC_LINK_SECRET') || 'dev-magic-secret';
    const sig = createHmac('sha256', secret).update(token).digest('hex');
    return `${token}.${sig}`;
  }

  verifyMagicToken(signedToken: string): string | null {
    const [token, sig] = signedToken.split('.');
    if (!token || !sig) return null;
    const expected = createHmac('sha256', this.config.get<string>('MAGIC_LINK_SECRET') || 'dev-magic-secret')
      .update(token)
      .digest('hex');
    if (sig !== expected) return null;
    return signedToken;
  }

  async validateMagicLink(signedToken: string) {
    const verified = this.verifyMagicToken(signedToken);
    if (!verified) throw new UnauthorizedException('Invalid magic link');
    const link = await this.prisma.magicLink.findUnique({
      where: { token: verified },
      include: { ticket: true },
    });
    if (!link || link.expiresAt < new Date()) {
      throw new UnauthorizedException('Magic link expired');
    }
    return link;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  validateCsrf(sessionToken: string, csrfHeader: string | undefined): void {
    if (!csrfHeader) throw new BadRequestException('CSRF token required');
    // CSRF validated in guard via session lookup
  }

  async createApiToken(userId: string, name: string, permissions: string[]) {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.apiToken.create({
      data: { userId, name, tokenHash, permissions },
    });
    await this.audit.log({
      actorId: userId,
      entityType: 'api_token',
      entityId: tokenHash,
      action: 'created',
    });
    return rawToken;
  }
}
