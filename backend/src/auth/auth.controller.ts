import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './auth.guards';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    if (!user) {
      res.status(401);
      return { message: 'Invalid credentials' };
    }
    const session = await this.auth.createSession(user.id);
    res.cookie('session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expiresAt,
    });
    return { user, csrfToken: session.csrfToken };
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
}
