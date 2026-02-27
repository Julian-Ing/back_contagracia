import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpException, HttpStatus, ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = { statusCode: 500, message: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception && typeof exception === 'object' && 'getStatus' in exception && 'getResponse' in exception) {
      const exc = exception as any;
      status = exc.getStatus();
      message = exc.getResponse();
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    response.status(status).json(message);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS
  app.enableCors();

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  // Filtro global de excepciones
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Contagracia Admin Service API')
    .setDescription('API de administración de plataforma Contagracia (Super Admin)')
    .setVersion('1.0')
    .addTag('plans', 'Gestión de planes de suscripción')
    .addTag('parametrics', 'Tablas paramétricas del sistema')
    .addTag('companies', 'Gestión de empresas (admin)')
    .addTag('users', 'Gestión de usuarios (admin)')
    .addTag('blog', 'Gestión de blog')
    .addTag('categories', 'Gestión de categorías de compañías')
    .addTag('system', 'Estado del sistema')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese su JWT token de super admin',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`🚀 Admin Service running on port ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
