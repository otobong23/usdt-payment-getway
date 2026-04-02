import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import * as bodyParser from 'body-parser';
import { ENVIRONMENT } from './common/constant/enivronment/enviroment';
config()

const port = ENVIRONMENT.CONNECTION.PORT || 4000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    bodyParser.json({
      limit: '10mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf.toString();
      },
    }),
  );

  app.use(
    bodyParser.urlencoded({
      limit: '10mb',
      extended: true,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips properties not in the DTO
      forbidNonWhitelisted: true, // throws error if extra properties
      transform: true, // transforms plain JSON into class instances
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
