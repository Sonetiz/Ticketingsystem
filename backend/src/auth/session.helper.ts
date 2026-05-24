import { Response } from 'express';
import { AuthService } from './auth.service';

export function setSessionCookie(
  res: Response,
  session: { token: string; csrfToken: string; expiresAt: Date },
) {
  res.cookie('session', session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: session.expiresAt,
  });
}

export async function establishSession(
  auth: AuthService,
  userId: string,
  res: Response,
): Promise<{ csrfToken: string }> {
  const session = await auth.createSession(userId);
  setSessionCookie(res, session);
  return { csrfToken: session.csrfToken };
}
