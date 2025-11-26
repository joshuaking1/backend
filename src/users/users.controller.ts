import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorator/get-user.decorator';
import * as client from '@prisma/client'; // Import the User type

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard) // <-- This is our bouncer!
  @Get('me')
  getMe(@GetUser() user: client.User) {
    return user;
  }
}