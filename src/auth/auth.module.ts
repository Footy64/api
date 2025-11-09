import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {DbModule} from '../db/db.module';
import {AuthService} from './auth.service';
import {AuthController} from './auth.controller';

const expires: any = process.env.JWT_EXPIRES_IN ?? '15m';


@Module({
    imports: [
        DbModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET!,
            signOptions: {expiresIn: expires},
        })
    ],
    providers: [AuthService],
    controllers: [AuthController],
})
export class AuthModule {
}
