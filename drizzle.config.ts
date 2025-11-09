import 'dotenv/config';
import {defineConfig} from 'drizzle-kit';

const url = process.env.TURSO_AUTH_TOKEN
    ? `${process.env.TURSO_DATABASE_URL}?authToken=${encodeURIComponent(process.env.TURSO_AUTH_TOKEN)}`
    : process.env.TURSO_DATABASE_URL!;

export default defineConfig({
    schema: './src/db/schema.ts',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {url},
});
