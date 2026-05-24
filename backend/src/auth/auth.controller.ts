import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  Query,
  UseGuards,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SessionAuthGuard, CsrfGuard } from './auth.guards';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { establishSession } from './session.helper';
import { ConfigService } from '@nestjs/config';
import { SessionUser } from '@ticketsystem/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('config')
  getConfig() {
    return this.auth.getAuthConfig();
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    if (!user) {
      res.status(401);
      return { message: 'Invalid credentials' };
    }
    const { csrfToken } = await establishSession(this.auth, user.id, res);
    return { user, csrfToken };
  }

  @Get('microsoft')
  microsoftLogin(@Query('returnTo') returnTo: string, @Res() res: Response) {
    if (!this.auth.isSsoEnabled()) {
      throw new BadRequestException('SSO is not enabled');
    }
    const safeReturnTo = returnTo?.startsWith('/') ? returnTo : '/portal';
    const url = this.auth.getMicrosoftAuthUrl(safeReturnTo);
    return res.redirect(url);
  }

  @Get('microsoft/callback')
  async microsoftCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code) {
      const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/portal/login?error=sso_failed`);
    }

    const { returnTo } = this.auth.parseOAuthState(state || '');
    const result = await this.auth.handleMicrosoftCallback(code);
    const session = await this.auth.createSession(result.user.id);
    res.cookie('session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expiresAt,
    });

    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const callbackPath = returnTo.startsWith('/manage') ? '/manage/login/callback' : '/portal/login/callback';
    return res.redirect(
      `${frontendUrl}${callbackPath}?csrf=${encodeURIComponent(session.csrfToken)}&returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  async logout(@Req() req: Request & { sessionToken?: string }, @Res({ passthrough: true }) res: Response) {
    if (req.sessionToken) await this.auth.destroySession(req.sessionToken);
    res.clearCookie('session');
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async me(@Req() req: Request & { user: unknown }) {
    return req.user;
  }

  @Post('password/forgot')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('password/reset')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Post('password/change')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard, CsrfGuard)
  async changePassword(
    @Req() req: Request & { user: SessionUser },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('sessions/revoke-all')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard, CsrfGuard)
  async revokeAllSessions(@Req() req: Request & { user: SessionUser; sessionToken?: string }) {
    return this.auth.revokeAllSessions(req.user.id, req.sessionToken);
  }
}
