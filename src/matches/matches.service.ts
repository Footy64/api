import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, or } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import { alias } from 'drizzle-orm/sqlite-core';
import { matches, teamMembers, teams } from '../schema';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateScoreDto } from './dto/update-score.dto';

type Db = any;

@Injectable()
export class MatchesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private async getTeams(teamIds: number[]) {
    const uniqueIds = Array.from(new Set(teamIds));
    if (!uniqueIds.length) return [];
    return this.db.select().from(teams).where(inArray(teams.id, uniqueIds));
  }

  private mapMatchResponse(row: any) {
    return {
      id: row.id,
      date: this.toIso(row.matchDate),
      place: row.place,
      createdBy: row.createdBy,
      createdAt: this.toIso(row.createdAt),
      homeTeam: {
        id: row.homeTeamId,
        name: row.homeTeamName,
      },
      awayTeam: {
        id: row.awayTeamId,
        name: row.awayTeamName,
      },
      score: {
        home: row.homeScore ?? null,
        away: row.awayScore ?? null,
      },
    };
  }

  private async ensureUserInTeams(userId: number, teamIds: number[]) {
    if (!teamIds.length) {
      throw new ForbiddenException('You must specify teams');
    }
    const memberships = await this.db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.userId, userId),
          inArray(teamMembers.teamId, teamIds),
        ),
      );
    const found = new Set(memberships.map((row: any) => row.teamId));
    if (found.size === 0) {
      throw new ForbiddenException('You must be a member of one of the teams');
    }
  }

  private ensureDistinctTeams(homeTeamId: number, awayTeamId: number) {
    if (homeTeamId === awayTeamId) {
      throw new ConflictException('Match must be between different teams');
    }
  }

  private toIso(value: unknown) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') {
      return new Date(value * 1000).toISOString();
    }
    return new Date(value as any).toISOString();
  }

  private parseDate(dateString: string) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new ConflictException('Invalid match date');
    }
    return date;
  }

  async createMatch(userId: number, dto: CreateMatchDto) {
    this.ensureDistinctTeams(dto.homeTeamId, dto.awayTeamId);
    const relevantTeams = await this.getTeams([dto.homeTeamId, dto.awayTeamId]);
    const teamMap = new Map(relevantTeams.map((team: any) => [team.id, team]));

    const homeTeam = teamMap.get(dto.homeTeamId);
    const awayTeam = teamMap.get(dto.awayTeamId);

    if (!homeTeam || !awayTeam) {
      throw new NotFoundException('One or both teams not found');
    }

    await this.ensureUserInTeams(userId, [dto.homeTeamId, dto.awayTeamId]);

    const matchDate = this.parseDate(dto.date);
    const place = dto.place.trim();
    if (!place) {
      throw new ConflictException('Match place cannot be empty');
    }

    const insertQuery = this.db
      .insert(matches)
      .values({
        homeTeamId: dto.homeTeamId,
        awayTeamId: dto.awayTeamId,
        matchDate,
        place,
        createdBy: userId,
      })
      .returning();
    const inserted = (await insertQuery.get?.()) ?? (await insertQuery)[0];

    return this.getMatchById(inserted.id, userId);
  }

  private async getMatchById(matchId: number, userId: number) {
    const matchRow = await this.fetchMatches({ matchIds: [matchId], userId });
    if (!matchRow.length) {
      throw new NotFoundException('Match not found');
    }
    return matchRow[0];
  }

  private async fetchMatches(args: { userId: number; matchIds?: number[] }) {
    const userTeams = await this.db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, args.userId));

    const teamIds = userTeams.map((row: any) => row.teamId);
    if (!teamIds.length) return [];

    const baseFilter = or(
      inArray(matches.homeTeamId, teamIds),
      inArray(matches.awayTeamId, teamIds),
    );
    const filters = [baseFilter];

    if (args.matchIds?.length) {
      filters.push(inArray(matches.id, args.matchIds));
    }

    const whereClause = filters.length > 1 ? and(...filters) : filters[0];

    const homeTeams = alias(teams, 'home');
    const awayTeams = alias(teams, 'away');

    const rows = await this.db
      .select({
        id: matches.id,
        matchDate: matches.matchDate,
        place: matches.place,
        createdBy: matches.createdBy,
        createdAt: matches.createdAt,
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        homeTeamName: homeTeams.name,
        awayTeamName: awayTeams.name,
      })
      .from(matches)
      .innerJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
      .innerJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
      .where(whereClause);

    return rows.map((row: any) => this.mapMatchResponse(row));
  }

  async listMatches(userId: number) {
    return this.fetchMatches({ userId });
  }

  async updateScore(matchId: number, userId: number, dto: UpdateScoreDto) {
    const matchQuery = this.db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId));
    const match = (await matchQuery.get?.()) ?? (await matchQuery)[0];
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    await this.ensureUserInTeams(userId, [match.homeTeamId, match.awayTeamId]);

    const updateQuery = this.db
      .update(matches)
      .set({ homeScore: dto.homeScore, awayScore: dto.awayScore })
      .where(eq(matches.id, matchId))
      .returning();
    const updated = (await updateQuery.get?.()) ?? (await updateQuery)[0];

    return this.getMatchById(updated.id, userId);
  }
}
