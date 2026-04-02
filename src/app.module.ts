import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TronPollingModule } from './tron-polling/tron-polling.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookingModule } from './webhooking/webhooking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('MONGO_DB'),
      }),
      inject: [ConfigService],
    }),
    TronPollingModule,
    WebhookingModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
