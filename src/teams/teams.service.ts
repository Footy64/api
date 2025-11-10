import { Inject, Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { teamMembers, teams, users } from '../schema';

type Db = any;

@Injectable()
export class TeamsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private async ensureUsersExist(userIds: number[]) {
    if (!userIds.length) return;
    const rows = await this.db.select({ id: users.id }).from(users).where(inArray(users.id, userIds));
    const found = new Set(rows.map((r: { id: number }) => r.id));
    const missing = userIds.filter((id) => !found.has(id));
    if (missing.length) {
      throw new NotFoundException(`Users not found: ${missing.join(', ')}`);
    }
  }

  private normalizeMembers(memberIds: number[], creatorId: number) {
    const normalized = Array.from(new Set([creatorId, ...memberIds]));
    return normalized;
  }

  private toIso(value: unknown) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') {
      return new Date(value * 1000).toISOString();
    }
    return new Date(value as any).toISOString();
  }

  async createTeam(creatorId: number, dto: CreateTeamDto) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new ConflictException('Team name cannot be empty');
    }
    const memberIds = this.normalizeMembers(dto.memberIds ?? [], creatorId);
    await this.ensureUsersExist(memberIds);

    const insertQuery = this.db
      .insert(teams)
      .values({ name: trimmedName, createdBy: creatorId })
      .returning();

    const inserted = (await insertQuery.get?.()) ?? (await insertQuery)[0];

    await this.db.insert(teamMembers).values(
      memberIds.map((userId) => ({ teamId: inserted.id, userId })),
    );

    return this.getTeam(inserted.id);
  }

  async getTeam(teamId: number) {
    const teamQuery = this.db.select().from(teams).where(eq(teams.id, teamId));
    const team = (await teamQuery.get?.()) ?? (await teamQuery)[0];
    if (!team) throw new NotFoundException('Team not found');

    const memberRows = await this.db
      .select({
        userId: teamMembers.userId,
        email: users.email,
        displayName: users.displayName,
      })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(eq(teamMembers.teamId, teamId));

    return {
      id: team.id,
      name: team.name,
      createdBy: team.createdBy,
      createdAt: this.toIso(team.createdAt),
      members: memberRows.map((member: any) => ({
        id: member.userId,
        email: member.email,
        displayName: member.displayName,
      })),
    };
  }

  async listTeamsForUser(userId: number) {
    const rows = await this.db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    const teamIds = rows.map((r: { teamId: number }) => r.teamId);
    if (!teamIds.length) return [];

    const teamsRows = await this.db.select().from(teams).where(inArray(teams.id, teamIds));
    const memberRows = await this.db
      .select({
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        email: users.email,
        displayName: users.displayName,
      })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(inArray(teamMembers.teamId, teamIds));

    const membersByTeam = new Map<number, any[]>();
    memberRows.forEach((row: any) => {
      const arr = membersByTeam.get(row.teamId) ?? [];
      arr.push({
        id: row.userId,
        email: row.email,
        displayName: row.displayName,
      });
      membersByTeam.set(row.teamId, arr);
    });

    return teamsRows.map((team: any) => ({
      id: team.id,
      name: team.name,
      createdBy: team.createdBy,
      createdAt: this.toIso(team.createdAt),
      members: membersByTeam.get(team.id) ?? [],
    }));
  }

  private async ensureTeamMember(teamId: number, userId: number) {
    const query = this.db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    const membership = (await query.get?.()) ?? (await query)[0];
    if (!membership) {
      throw new ForbiddenException('You are not a member of this team');
    }
  }

  async addMember(teamId: number, actorId: number, dto: AddTeamMemberDto) {
    await this.ensureTeamMember(teamId, actorId);
    await this.ensureUsersExist([dto.userId]);

    const existingQuery = this.db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, dto.userId)));
    const existing = (await existingQuery.get?.()) ?? (await existingQuery)[0];
    if (existing) {
      throw new ConflictException('User already in team');
    }

    await this.db.insert(teamMembers).values({ teamId, userId: dto.userId });
    return this.getTeam(teamId);
  }

  async removeMember(teamId: number, actorId: number, memberId: number) {
    await this.ensureTeamMember(teamId, actorId);

    const deleteQuery = this.db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, memberId)));
    const result = (await deleteQuery.run?.()) ?? (await deleteQuery);
    const changes = Array.isArray(result)
      ? result.length
      : typeof result?.changes === 'number'
        ? result.changes
        : typeof result?.rowsAffected === 'number'
          ? result.rowsAffected
          : 0;
    if (changes === 0) {
      throw new NotFoundException('Member not in team');
    }

    return this.getTeam(teamId);
  }
}
