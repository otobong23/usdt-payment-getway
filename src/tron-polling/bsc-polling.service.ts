import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';

import { BlockTracker, BlockTrackerDocument } from './schema/tron-polling.schema';
import { TronTransaction, TronTransactionDocument } from './schema/tron-transactions.schema';
import { ENVIRONMENT } from 'src/common/constant/enivronment/enviroment';

@Injectable()
export class BscPollingService implements OnModuleInit {
  private readonly logger = new Logger(BscPollingService.name);

  constructor(
    @InjectModel(BlockTracker.name)
    private readonly blockTrackerModel: Model<BlockTrackerDocument>,

    @InjectModel(TronTransaction.name)
    private readonly txModel: Model<TronTransactionDocument>,
  ) {}

  // =========================
  // CONFIG
  // =========================

  private readonly walletAddress =
    ENVIRONMENT.WALLET_ADDRESS.USDT_BEP20.toLowerCase();

  private readonly USDT_CONTRACT =
    '0x55d398326f99059fF775485246999027B3197955';

  private readonly provider = new ethers.JsonRpcProvider(
    'https://rpc.ankr.com/bsc/2219885ad4ad8559547e97dfce1c791cb8cce13906b4517ce5f40204c665a04a',
  );

  private readonly iface = new ethers.Interface([
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ]);

  private readonly CONFIRMATIONS = 3;
  private readonly BATCH_SIZE = 50;
  private readonly INTERVAL = 15000;

  private isRunning = false;

  // =========================
  // INIT
  // =========================

  async onModuleInit() {
    this.logger.log('🚀 BSC Polling Service Started');
    setInterval(() => this.run(), this.INTERVAL);
  }

  // =========================
  // MAIN LOOP (SOURCE OF TRUTH)
  // =========================

  private async run() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const latestBlock = await this.provider.getBlockNumber();
      const safeBlock = latestBlock - this.CONFIRMATIONS;

      const tracker = await this.getTracker();

      let fromBlock = tracker.lastProcessedBlock || safeBlock - 20;

      if (fromBlock >= safeBlock) return;

      const toBlock = Math.min(fromBlock + this.BATCH_SIZE, safeBlock);

      this.logger.log(`Scanning blocks ${fromBlock} → ${toBlock}`);

      const logs = await this.provider.getLogs({
        address: this.USDT_CONTRACT,
        fromBlock,
        toBlock,
        topics: [ethers.id('Transfer(address,address,uint256)')],
      });

      for (const log of logs) {
        await this.processLog(log);
      }

      await this.updateLastBlock(toBlock);
    } catch (err) {
      this.logger.error('Polling error', err);
    } finally {
      this.isRunning = false;
    }
  }

  // =========================
  // PROCESS LOG
  // =========================

  private async processLog(log: ethers.Log) {
    try {
      const parsed = this.iface.parseLog(log);
      if (!parsed) return;

      const from = parsed.args.from.toLowerCase();
      const to = parsed.args.to.toLowerCase();
      const value = parsed.args.value;
      
      
      if (to !== this.walletAddress) return;
      
      this.logger.log({from, to, value})

      const txHash = log.transactionHash;
      const uniqueId = `${txHash}_${log.index}`;

      const amount = ethers.formatUnits(value, 18);

      await this.txModel.updateOne(
        { uniqueId },
        {
          $setOnInsert: {
            uniqueId,
            txHash,
            from,
            to,
            amount,
            blockNumber: log.blockNumber,
            status: 'CONFIRMED',
            webhookStatus: 'PENDING',
          },
        },
        { upsert: true },
      );

      this.logger.log(
        `💰 ${amount} USDT | ${from} → ${to} | ${txHash}`,
      );
    } catch (err) {
      this.logger.error('Log processing error', err);
    }
  }

  // =========================
  // TRACKER
  // =========================

  private async getTracker() {
    const tracker = await this.blockTrackerModel.findOne({ chain: 'bsc' });

    if (!tracker) {
      const latest = await this.provider.getBlockNumber();
      return { lastProcessedBlock: latest - 20 };
    }

    return tracker;
  }

  private async updateLastBlock(blockNumber: number) {
    await this.blockTrackerModel.updateOne(
      { chain: 'bsc' },
      { lastProcessedBlock: blockNumber },
      { upsert: true },
    );
  }
}