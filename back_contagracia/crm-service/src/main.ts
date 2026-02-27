import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.setGlobalPrefix('api', {
    exclude: ['public/forms/:slug/submit'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Contagracia CRM Service API')
    .setDescription('API del módulo CRM: contactos, leads, oportunidades, campañas, actividades y más')
    .setVersion('1.0')
    .addTag('stages', 'Etapas del pipeline de oportunidades')
    .addTag('tags', 'Tags de contactos')
    .addTag('contacts', 'Gestión de contactos CRM')
    .addTag('campaigns', 'Campañas de marketing')
    .addTag('leads', 'Gestión de leads')
    .addTag('opportunities', 'Pipeline de oportunidades')
    .addTag('activities', 'Actividades CRM')
    .addTag('forms', 'Formularios web de captura')
    .addTag('automations', 'Reglas de automatización')
    .addTag('email', 'Email marketing')
    .addTag('whatsapp', 'WhatsApp messaging')
    .addTag('dashboard', 'Dashboard y estadísticas')
    .addTag('team', 'Equipo y rendimiento')
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

  const port = process.env.PORT ?? 3011;
  await app.listen(port);
  console.log(`CRM Service running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
