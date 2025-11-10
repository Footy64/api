import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const allowedOriginsEnv = config.get<string>('CORS_ALLOWED_ORIGINS');
  const parsedOrigins = allowedOriginsEnv
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [
    'http://localhost:4200',
    'https://footy69.vercel.app/',
  ];

  const corsOptions: CorsOptions = {
    origin: parsedOrigins.includes('*') ? true : parsedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  };

  app.enableCors(corsOptions);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

bootstrap();
