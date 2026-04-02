

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TronTransactionDocument = TronTransaction & Document;

@Schema({ timestamps: true })
export class TronTransaction {
  @Prop({ required: true, unique: true })
  txHash: string;

  @Prop({ required: true })
  from: string;

  @Prop({ required: true })
  to: string;

  @Prop()
  amount: string

  @Prop({ index: true })
  blockNumber: number

  @Prop({ default: 'PENDING', enum: ['PENDING', 'CONFIRMED', 'FAILED'] })
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';


  @Prop({ type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING' })
  webhookStatus: string;

  @Prop({ type: Number, default: 0 })
  webhookAttempts: number;

  @Prop()
  lastWebhookError: String
}

export const TronTransactionSchema = SchemaFactory.createForClass(TronTransaction);