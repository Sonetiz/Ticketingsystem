import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionToken = request.cookies?.session;
    if (!sessionToken) throw new UnauthorizedException();

    const user = await this.auth.getSessionUser(sessionToken);
    if (!user) throw new UnauthorizedException();

    request.user = user;
    request.sessionToken = sessionToken;
    return true;
  }
}

@Injectable()
export class OptionalSessionAuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionToken = request.cookies?.session;
    if (sessionToken) {
      const user = await this.auth.getSessionUser(sessionToken);
      if (user) {
        request.user = user;
        request.sessionToken = sessionToken;
      }
    }
    return true;
  }
}

@Injectable()
export class ApiTokenAuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException();
    const token = authHeader.slice(7);
    const user = await this.auth.validateApiToken(token);
    if (!user) throw new UnauthorizedException();
    request.user = user;
    return true;
  }
}

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionToken = request.cookies?.session;
    if (sessionToken) {
      const user = await this.auth.getSessionUser(sessionToken);
      if (user) {
        request.user = user;
        return true;
      }
    }
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const user = await this.auth.validateApiToken(authHeader.slice(7));
      if (user) {
        request.user = user;
        return true;
      }
    }
    throw new UnauthorizedException();
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const sessionToken = request.cookies?.session;
    const csrfHeader = request.headers['x-csrf-token'] as string;
    if (!sessionToken || !csrfHeader) throw new UnauthorizedException('CSRF validation failed');
    const expected = await this.auth.getSessionCsrf(sessionToken);
    if (!expected || expected !== csrfHeader) throw new UnauthorizedException('CSRF validation failed');
    return true;
  }
}

@Injectable()
export class ManagePortalGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionToken = request.cookies?.session;
    if (!sessionToken) throw new UnauthorizedException();
    const user = await this.auth.getSessionUser(sessionToken);
    if (!user) throw new UnauthorizedException();
    const canManage =
      user.permissions.includes('manage.*') ||
      user.roles.includes('super_admin') ||
      user.roles.includes('system_admin');
    if (!canManage) throw new UnauthorizedException('Management portal access denied');
    request.user = user;
    return true;
  }
}
