import { Module } from '@nestjs/common';
import { TronPollingService } from './tron-polling.service';
import { TronPollingController } from './tron-polling.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockTracker, BlockTrackerSchema } from './schema/tron-polling.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BlockTracker.name, schema: BlockTrackerSchema }]),
  ],
  controllers: [TronPollingController],
  providers: [TronPollingService],
})
export class TronPollingModule {}
