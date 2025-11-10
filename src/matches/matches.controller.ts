import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateScoreDto } from './dto/update-score.dto';

@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post()
  createMatch(@Req() req: any, @Body() dto: CreateMatchDto) {
    return this.matches.createMatch(req.user.userId, dto);
  }

  @Get()
  listMatches(@Req() req: any) {
    return this.matches.listMatches(req.user.userId);
  }

  @Patch(':matchId/score')
  updateScore(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Req() req: any,
    @Body() dto: UpdateScoreDto,
  ) {
    return this.matches.updateScore(matchId, req.user.userId, dto);
  }
}
