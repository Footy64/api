import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { Provider } from '@nestjs/common';
import * as schema from '../schema';

export const DRIZZLE = Symbol('DRIZZLE');

export const DrizzleProvider: Provider = {
  provide: DRIZZLE,
  useFactory: () => {
    console.log(process.env.TURSO_DATABASE_URL);
    console.log(process.env.TURSO_AUTH_TOKEN);
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    return drizzle(client, { schema });
  },
};
