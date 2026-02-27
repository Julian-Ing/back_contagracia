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
    .setTitle('Contagracia Users Service API')
    .setDescription('API de gestión de usuarios de tenant para Contagracia')
    .setVersion('1.0')
    .addTag('users', 'Gestión de usuarios del tenant')
    .addTag('roles', 'Gestión de roles del tenant')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingrese su JWT token',
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

  const port = 3004;
  await app.listen(port);
  console.log(`🚀 Users Service running on port ${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
