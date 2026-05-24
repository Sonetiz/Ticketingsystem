import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

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
