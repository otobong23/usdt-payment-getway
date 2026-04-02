import { Module } from '@nestjs/common';
import { TronPollingService } from './tron-polling.service';
import { TronPollingController } from './tron-polling.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockTracker, BlockTrackerSchema } from './schema/tron-polling.schema';
import { TronTransaction, TronTransactionSchema } from './schema/tron-transactions.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlockTracker.name, schema: BlockTrackerSchema },
      { name: TronTransaction.name, schema: TronTransactionSchema },
    ]),
  ],
  controllers: [TronPollingController],
  providers: [TronPollingService],
})
export class TronPollingModule {}
