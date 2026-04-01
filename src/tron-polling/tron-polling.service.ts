import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import axios from 'axios';
import { TronGridBaseUrl, TronPollingEndpoints } from 'src/common/constant/endpoints/API_Endpoints';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlockTracker, BlockTrackerDocument } from './schema/tron-polling.schema';
import { ENVIRONMENT } from 'src/common/constant/enivronment/enviroment';

@Injectable()
export class TronPollingService implements OnModuleInit {
  private readonly logger = new Logger(TronPollingService.name);
  constructor(
    @InjectModel(BlockTracker.name) private readonly blockTrackerModel: Model<BlockTrackerDocument>,
  ) { }

  private authFeth = axios.create({
    baseURL: TronGridBaseUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: ENVIRONMENT.TRON.API_KEY,
    },
    timeout: 30000,
  })


  // 1. Get the latest block number
  async getLatestBlockNumber(): Promise<number> {
    const res = await this.authFeth.get(TronPollingEndpoints.getNowBlock);

    return res.data.block_header.raw_data.number;
  }

  // 2. Get full block data by number
  async getBlockByNumber(blockNumber: number) {
    const res = await this.authFeth.post(TronPollingEndpoints.getBlockByNum, {
      num: blockNumber,
    });
    return res.data;
  }

  private async safeGetBlock(i: number, retries = 3) {
  try {
    return await this.getBlockByNumber(i);
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise(res => setTimeout(res, 1000));
    return this.safeGetBlock(i, retries - 1);
  }
}

  onModuleInit() {
    this.start();
  }

  private start() {
    setInterval(() => this.run(), 5000); // every 5 seconds
  }

  private isRunning = false;

  private async run() {
    if (this.isRunning) return;

    this.isRunning = true;

    try {
      const latestBlock = await this.getLatestBlockNumber();

      const tracker = await this.getTracker();
      let lastBlock = tracker.lastProcessedBlock || latestBlock - 5;

      if (lastBlock >= latestBlock) return;

      const MAX_BLOCKS = 20;

      for (let i = lastBlock + 1; i <= Math.min(lastBlock + MAX_BLOCKS, latestBlock); i++) {
        const block = await this.safeGetBlock(i);

        await this.processBlock(block);

        await this.updateLastBlock(i);
      }

    } catch (err) {
      this.logger.error('Indexer error', err);
    } finally {
      this.isRunning = false;
    }
  }

  private async processBlock(block: any) {
    if (!block?.transactions) return;

    for (const tx of block.transactions) {
      await this.processTransaction(tx);
    }
  }

  private async updateLastBlock(blockNumber: number) {
    await this.blockTrackerModel.updateOne(
      { chain: 'tron' },
      { lastProcessedBlock: blockNumber },
      { upsert: true },
    );
  }

  private async getTracker() {
    return (
      (await this.blockTrackerModel.findOne({ chain: 'tron' })) || {
        lastProcessedBlock: 0,
      }
    );
  }

  async processTransaction(tx: any) {
    try {
      const contract = tx.raw_data.contract?.[0];
      if (!contract) return;

      // Only smart contract calls
      if (contract.type !== 'TriggerSmartContract') return;

      // I can probably run a webhook here to notify other services about the transaction
      return tx;

      // const value = contract.parameter.value;
      // const txHash = tx.txID;

      // Prevent duplicates
      // const exists = await this.txModel.findOne({ txHash });


    } catch (err) {
      this.logger.error('TX processing error', err);
    }
  }
}
