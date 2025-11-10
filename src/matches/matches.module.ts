import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  providers: [MatchesService],
  controllers: [MatchesController],
})
export class MatchesModule {}
