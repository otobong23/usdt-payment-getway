import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TronPollingModule } from './tron-polling/tron-polling.module';

@Module({
  imports: [TronPollingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
