import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [DbModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
