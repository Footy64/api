import {createClient} from '@libsql/client';
import {drizzle} from 'drizzle-orm/libsql';
import {Provider} from '@nestjs/common';
import * as schema from '../schema';

export const DRIZZLE = Symbol('DRIZZLE');

export const DrizzleProvider: Provider = {
    provide: DRIZZLE,
    useFactory: () => {
        const client = createClient({
            url: process.env.TURSO_URL!,
            authToken: process.env.TURSO_TOKEN!,
        });
        return drizzle(client, {schema});
    },
};
