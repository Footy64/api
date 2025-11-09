import {ConflictException, Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import {eq} from 'drizzle-orm';
import {JwtService} from '@nestjs/jwt';
import * as argon2 from 'argon2';
import {DRIZZLE} from '../db/drizzle.provider';
import {users} from '../schema';

type Db = any;

@Injectable()
export class AuthService {
    constructor(
        @Inject(DRIZZLE) private readonly db: Db,
        private readonly jwt: JwtService,
    ) {
    }

    async register(input: { email: string; password: string; displayName?: string }) {
        const email = input.email.toLowerCase();
        const existing = await this.db.select().from(users).where(eq(users.email, email)).get?.()
            ?? (await this.db.select().from(users).where(eq(users.email, email)))[0];
        if (existing) throw new ConflictException('Email already used');

        const passwordHash = await argon2.hash(input.password, {type: argon2.argon2id});
        const inserted = await this.db
            .insert(users)
            .values({email, passwordHash, displayName: input.displayName})
            .returning()
            .get?.() ?? (await this.db.insert(users).values({
            email,
            passwordHash,
            displayName: input.displayName
        }).returning())[0];

        const token = await this.signToken(inserted.id, inserted.email);
        return {user: this.sanitize(inserted), accessToken: token};
    }

    async login(input: { email: string; password: string }) {
        const email = input.email.toLowerCase();
        const row = await this.db.select().from(users).where(eq(users.email, email)).get?.()
            ?? (await this.db.select().from(users).where(eq(users.email, email)))[0];
        if (!row) throw new UnauthorizedException('Invalid credentials');

        const ok = await argon2.verify(row.passwordHash, input.password);
        if (!ok) throw new UnauthorizedException('Invalid credentials');

        const token = await this.signToken(row.id, row.email);
        return {user: this.sanitize(row), accessToken: token};
    }

    private async signToken(sub: number, email: string) {
        return this.jwt.signAsync({sub, email});
    }

    private sanitize(u: any) {
        const {passwordHash, ...rest} = u;
        return rest;
    }
}
