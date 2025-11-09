import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';

export const users = sqliteTable('users', {
    id: integer('id').primaryKey({autoIncrement: true}),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name'),
    createdAt: integer('created_at', {mode: 'timestamp'})
        .notNull()
        .default(sql`(unixepoch()
                     )`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
