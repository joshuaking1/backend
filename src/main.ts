import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // 1. Import ValidationPipe

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Relaxed CORS for local development: allow any origin with credentials
  app.enableCors({
    origin: true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Enable the global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away any properties that don't have a decorator in the DTO
      forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are provided
      transform: true, // Automatically transforms payloads to be instances of the DTO class
    }),
  );

  await app.listen(3333);
}
bootstrap();