import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';

import { BlockTracker, BlockTrackerDocument } from './schema/tron-polling.schema';
import { TronTransaction, TronTransactionDocument } from './schema/tron-transactions.schema';
import { ENVIRONMENT } from 'src/common/constant/enivronment/enviroment';

const YOUR_TX_BLOCK = 91557591

@Injectable()
export class BscPollingService implements OnModuleInit {
  private readonly logger = new Logger(BscPollingService.name);

  constructor(
    @InjectModel(BlockTracker.name)
    private readonly blockTrackerModel: Model<BlockTrackerDocument>,

    @InjectModel(TronTransaction.name)
    private readonly txModel: Model<TronTransactionDocument>,
  ) { }

  // =========================
  // CONFIG
  // =========================

  private readonly walletAddress =
    ethers.getAddress(ENVIRONMENT.WALLET_ADDRESS.USDT_BEP20.toLowerCase());    // 0x5236b9c8642d640f2847e71d177ae231f8ec8762

  private readonly USDT_CONTRACT =
    '0x55d398326f99059fF775485246999027B3197955';

  private readonly provider = new ethers.JsonRpcProvider(
    'https://rpc.ankr.com/bsc/2219885ad4ad8559547e97dfce1c791cb8cce13906b4517ce5f40204c665a04a',
  );

  private readonly iface = new ethers.Interface([
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ]);

  private readonly transferTopic = ethers.id(
    'Transfer(address,address,uint256)'
  );

  private readonly paddedWallet = ethers.zeroPadValue(
    this.walletAddress,
    32
  );

  private readonly CONFIRMATIONS = 3;
  private readonly BATCH_SIZE = 50;
  private readonly INTERVAL = 15000;

  private readonly MAX_DRIFT = 5000;

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

      let fromBlock = tracker.lastProcessedBlock;

      // If no tracker → initialize properly
      if (!fromBlock) {
        fromBlock = safeBlock - 20;
      }

      // PROTECTION 1: Prevent backward corruption
      if (fromBlock < safeBlock - this.MAX_DRIFT) {
        const resetBlock = safeBlock - 20;

        this.logger.warn(
          `lastProcessedBlock too far behind. Resetting from ${fromBlock} → ${resetBlock}`
        );

        fromBlock = resetBlock;
        await this.updateLastBlock(resetBlock); // ✅ persist fix
      }


      // PROTECTION 2: Prevent forward corruption
      if (fromBlock > safeBlock) {
        const resetBlock = safeBlock - 20;

        this.logger.warn(
          `lastProcessedBlock ahead of chain. Resetting to ${resetBlock}`
        );

        fromBlock = resetBlock;
        await this.updateLastBlock(resetBlock); // ✅ persist
      }

      const toBlock = Math.min(fromBlock + this.BATCH_SIZE, safeBlock);

      this.logger.log(`Scanning blocks ${fromBlock} → ${toBlock}`);

      const logs = await this.provider.getLogs({
        address: this.USDT_CONTRACT,
        fromBlock,
        toBlock,
        topics: [
          this.transferTopic,
          null,
          this.paddedWallet,
        ],
      });

      // TEMP DEBUG
      // this.logger.log(`Total logs found: ${logs.length}`);
      // this.logger.log(`paddedWallet: ${this.paddedWallet}`);
      // this.logger.log(`transferTopic: ${this.transferTopic}`);

      for (const log of logs) {
        await this.processLog(log);
      }

      // Always move forward safely
      const newLastBlock = Math.min(toBlock, safeBlock);

      // FINAL GUARD: never store insane values
      if (newLastBlock < fromBlock) {
        this.logger.warn(`Attempt to move backwards prevented`);
        return;
      }

      await this.updateLastBlock(newLastBlock);
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

      this.logger.log('log: ', log)

      const parsed = this.iface.parseLog(log);
      if (!parsed) return;

      const from = parsed.args.from.toLowerCase();
      const to = parsed.args.to.toLowerCase();
      const value = parsed.args.value;

      // if (to !== this.walletAddress) return;   // This part is unnecessary

      const txHash = log.transactionHash;

      const amount = ethers.formatUnits(value, 18);    //  BSC USDT uses 18 decimals

      this.logger.log({ from, to, amount })

      await this.txModel.updateOne(
        { txHash },
        {
          $setOnInsert: {
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
      const startBlock = latest - 20;

      const created = await this.blockTrackerModel.create({
        chain: 'bsc',
        lastProcessedBlock: startBlock,
      });

      this.logger.log(`Tracker created: ${JSON.stringify(created)}`);

      return { lastProcessedBlock: startBlock };
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