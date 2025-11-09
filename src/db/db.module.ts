import {Module} from '@nestjs/common';
import {DRIZZLE, DrizzleProvider} from './drizzle.provider';

@Module({
    providers: [DrizzleProvider],
    exports: [DRIZZLE],
})
export class DbModule {
}
