import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Prefixo global de rotas conforme arquitetura SGMS
  app.setGlobalPrefix('api');

  // Habilitar CORS para permitir requisições da LAN física
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Filtro global de tratamento e padronização de exceções RFC 7807
  app.useGlobalFilters(new HttpExceptionFilter());

  // Pipeline global de validação estrita (Zero Fallback)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`SGMS Backend em execução na porta ${port} (0.0.0.0) com prefixo /api`);
}

void bootstrap();
