import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  createTeam(@Req() req: any, @Body() dto: CreateTeamDto) {
    return this.teams.createTeam(req.user.userId, dto);
  }

  @Get()
  listTeams(@Req() req: any) {
    return this.teams.listTeamsForUser(req.user.userId);
  }

  @Post(':teamId/members')
  addMember(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Req() req: any,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.teams.addMember(teamId, req.user.userId, dto);
  }

  @Delete(':teamId/members/:memberId')
  removeMember(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() req: any,
  ) {
    return this.teams.removeMember(teamId, req.user.userId, memberId);
  }
}
