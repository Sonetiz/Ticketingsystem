import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import {
  SessionAuthGuard,
  OptionalSessionAuthGuard,
  ApiTokenAuthGuard,
  CombinedAuthGuard,
  CsrfGuard,
  ManagePortalGuard,
} from './auth.guards';

@Global()
@Module({
  providers: [
    AuthService,
    SessionAuthGuard,
    OptionalSessionAuthGuard,
    ApiTokenAuthGuard,
    CombinedAuthGuard,
    CsrfGuard,
    ManagePortalGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, SessionAuthGuard, CombinedAuthGuard, CsrfGuard, ManagePortalGuard],
})
export class AuthModule {}
