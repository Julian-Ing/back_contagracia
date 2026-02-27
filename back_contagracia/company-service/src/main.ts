import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, HttpException, HttpStatus, ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Filtro global de excepciones que maneja el caso de múltiples instancias de @nestjs/common
@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = { statusCode: 500, message: 'Internal server error' };

    // Verificar si es HttpException (funciona cross-module)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    }
    // Fallback: verificar por nombre del constructor (para casos de múltiples instancias de @nestjs/common)
    else if (exception && typeof exception === 'object' && 'getStatus' in exception && 'getResponse' in exception) {
      const exc = exception as any;
      status = exc.getStatus();
      message = exc.getResponse();
    }
    // Manejo de errores genéricos
    else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    response.status(status).json(message);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Habilitar CORS
  app.enableCors();

  // Prefijo global para la API (excepto rutas internas)
  app.setGlobalPrefix('api', {
    exclude: ['_internal/puc', '_internal/accounting-config', '_internal/full'],
  });

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
    .setTitle('Contagracia Company Service API')
    .setDescription('API de gestión de empresas, tenant provisioning y usuarios de tenant')
    .setVersion('1.0')
    .addTag('companies', 'Gestión de empresas')
    .addTag('tenant-users', 'Gestión de usuarios de tenant (empleados)')
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

  const port = 3003;
  await app.listen(port);
  console.log(`Company Service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
