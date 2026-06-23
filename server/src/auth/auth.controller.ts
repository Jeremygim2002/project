// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterEmployeeDto } from './dto/register-employee.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.verifyTokenAndSaveUser(body.token);
    return {
      message: 'Autenticacion exitosa',
      user,
    };
  }

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    return {
      user: await this.authService.getUserProfile(
        this.getTokenFromAuthorization(authorization),
      ),
    };
  }

  @Post('register-admin')
  async registerAdmin(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: RegisterAdminDto,
  ) {
    return this.authService.registerAdmin(
      this.getTokenFromAuthorization(authorization),
      body,
    );
  }

  @Post('register-employee')
  async registerEmployee(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: RegisterEmployeeDto,
  ) {
    return this.authService.registerEmployee(
      this.getTokenFromAuthorization(authorization),
      body,
    );
  }

  private getTokenFromAuthorization(authorization?: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }

    return token;
  }
}
