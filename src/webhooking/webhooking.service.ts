import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { ENVIRONMENT } from 'src/common/constant/enivronment/enviroment';
import { TronTransaction, TronTransactionDocument } from 'src/tron-polling/schema/tron-transactions.schema';
import * as crypto from 'crypto';


@Injectable()
export class WebhookingService implements OnModuleInit {
  private readonly logger = new Logger(WebhookingService.name);
  constructor(
    @InjectModel(TronTransaction.name) private readonly txModel: Model<TronTransactionDocument>
  ) { }

  private signPayload(payload: any) {
    const secret = ENVIRONMENT.WEBHOOK.SECRET;

    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  onModuleInit() {
    this.startWebhookWorker();
  }

  private startWebhookWorker() {
    setInterval(() => this.processWebhooks(), 3000);
  }



  private isProcessingWebhooks = false;

  private async processWebhooks() {
    if (this.isProcessingWebhooks) return;
    this.isProcessingWebhooks = true;

    try {
      const txs = await this.txModel.find({
        webhookStatus: { $in: ['PENDING', 'FAILED'] },
        webhookAttempts: { $lt: 5 }
      }).limit(50);

      await Promise.allSettled(
        txs.map(tx => this.sendWebhook(tx, ENVIRONMENT.WEBHOOK.URL))
      );

    } catch (err) {
      this.logger.error('Webhook worker error', err);
    } finally {
      this.isProcessingWebhooks = false;
    }
  }

  private async sendWebhook(tx: TronTransactionDocument, webhookUrl: string) {
    try {
      const payload = {
        event: 'confirmed',
        data: {
          txHash: tx.txHash,
          from: tx.from,
          to: tx.to,
          amount: tx.amount,
          blockNumber: tx.blockNumber
        }
      };

      const signature = this.signPayload(payload);

      await axios.post(webhookUrl, payload, {
        headers: {
          'x-signature': signature
        },
        timeout: 10000
      });

      await this.txModel.updateOne(
        { txHash: tx.txHash },
        {
          $set: { webhookStatus: 'SENT' }
        }
      );

      this.logger.log(`Webhook sent: ${tx.txHash}`);

    } catch (err: any) {
      await this.txModel.updateOne(
        { txHash: tx.txHash },
        {
          $inc: { webhookAttempts: 1 },
          $set: {
            webhookStatus: 'FAILED',
            lastWebhookError: err.message
          }
        }
      );

      this.logger.warn(`Webhook failed: ${tx.txHash}`);
    }
  }
}
