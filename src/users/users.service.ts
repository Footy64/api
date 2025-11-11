import { Inject, Injectable } from '@nestjs/common';
import { like, or } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import { users } from '../schema';

type Db = any;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  private buildPattern(query: string): string {
    return '%' + query + '%';
  }

  async search(query: string, limit = 8) {
    const sanitized = query.trim();
    if (!sanitized) {
      return [];
    }

    const pattern = this.buildPattern(sanitized);

    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(
        or(
          like(users.displayName, pattern),
          like(users.email, pattern),
        ),
      )
      .limit(limit);

    return rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      displayName: row.displayName,
    }));
  }
}
