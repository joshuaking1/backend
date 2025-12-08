import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // 1. Import ValidationPipe

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // We will get this URL in the next step from Vercel. For now, we can prepare.
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://your-vercel-app.vercel.app', // Keep for local development
      // We will add our Vercel URL here later
      frontendUrl, // Dynamic frontend URL from environment variable
    ],
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

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3333;
  await app.listen(port, '0.0.0.0');
}
bootstrap();