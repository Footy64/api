import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { UsersService } from './users.service';
import { SearchUsersDto } from './dto/search-users.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('search')
  search(@Query() dto: SearchUsersDto) {
    return this.users.search(dto.query);
  }
}
