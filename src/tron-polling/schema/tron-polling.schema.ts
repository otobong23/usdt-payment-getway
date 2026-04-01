
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlockTrackerDocument = BlockTracker & Document;

@Schema({ timestamps: true })
export class BlockTracker {
  @Prop({ required: true, default: 'tron' })
  chain: string;

  @Prop({ required: true })
  lastProcessedBlock: number;
}

export const BlockTrackerSchema = SchemaFactory.createForClass(BlockTracker);