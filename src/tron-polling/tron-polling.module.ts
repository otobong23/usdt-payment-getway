import { Module } from '@nestjs/common';
import { TronPollingService } from './tron-polling.service';
import { TronPollingController } from './tron-polling.controller';

@Module({
  controllers: [TronPollingController],
  providers: [TronPollingService],
})
export class TronPollingModule {}
