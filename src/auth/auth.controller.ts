import { Body, Controller, Post, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthDto, SigninDto } from './dto/auth.dto';

@Controller('auth') // All routes in this controller will be prefixed with /auth
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup') // Handles POST requests to /auth/signup
  signup(@Body() dto: AuthDto) {
    return this.authService.signup(dto);
  }

  @Post('signin')
  async signin(
    @Body() dto: SigninDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.signin(dto);

    response.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true, // Prevents client-side JS from accessing the cookie
      secure: this.authService['config'].get('NODE_ENV') !== 'development', // Use secure cookies in production
      sameSite: 'strict', // Mitigates CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    response.status(HttpStatus.OK);
    return { access_token: tokens.accessToken };
  }
}