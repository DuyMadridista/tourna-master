import { Controller, Post, Body, UnauthorizedException, UseGuards, Get, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody } from '@nestjs/swagger';
import { LoginDto } from './login.dto';
import { SuccessResponse } from 'src/helper/OkResponse';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const res = await this.authService.login(user);
    return SuccessResponse(true, 1, res, '');
  }

   @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const loginResult = await this.authService.login(req.user);
    const { access_token, user } = loginResult;

    const redirectUrl = `https://halamadrid.me/oauthCallback?access_token=${access_token}&user=${encodeURIComponent(
      JSON.stringify(user),
    )}`

    return res.redirect(redirectUrl)
  }
}
