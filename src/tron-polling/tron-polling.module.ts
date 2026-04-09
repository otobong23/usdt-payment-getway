import { Module } from '@nestjs/common';
import { TronPollingService } from './tron-polling.service';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockTracker, BlockTrackerSchema } from './schema/tron-polling.schema';
import { TronTransaction, TronTransactionSchema } from './schema/tron-transactions.schema';
import { BscPollingService } from './bsc-polling.service';
import { PollingController } from './polling.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlockTracker.name, schema: BlockTrackerSchema },
      { name: TronTransaction.name, schema: TronTransactionSchema },
    ]),
  ],
  controllers: [PollingController],
  providers: [TronPollingService, BscPollingService],
})
export class TronPollingModule {}
