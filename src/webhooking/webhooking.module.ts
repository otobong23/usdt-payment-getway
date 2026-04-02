import { Module } from '@nestjs/common';
import { WebhookingService } from './webhooking.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TronTransaction, TronTransactionSchema } from 'src/tron-polling/schema/tron-transactions.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TronTransaction.name, schema: TronTransactionSchema },
    ]),
  ],
  controllers: [],
  providers: [WebhookingService],
})
export class WebhookingModule { }
