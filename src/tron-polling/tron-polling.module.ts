import { Module } from '@nestjs/common';
import { TronPollingService } from './tron-polling.service';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockTracker, BlockTrackerSchema } from './schema/tron-polling.schema';
import { TronTransaction, TronTransactionSchema } from './schema/tron-transactions.schema';
import { BscPollingService } from './bsc-polling.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlockTracker.name, schema: BlockTrackerSchema },
      { name: TronTransaction.name, schema: TronTransactionSchema },
    ]),
  ],
  controllers: [],
  providers: [TronPollingService, BscPollingService],
})
export class TronPollingModule {}
