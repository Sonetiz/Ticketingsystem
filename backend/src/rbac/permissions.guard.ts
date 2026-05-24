import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionUser } from '@ticketsystem/shared';
import { RbacService } from './rbac.service';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbac: RbacService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as SessionUser | undefined;
    if (!user) throw new ForbiddenException('Authentication required');

    const allowed = required.some((p) => this.rbac.hasPermission(user, p));
    if (!allowed) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
