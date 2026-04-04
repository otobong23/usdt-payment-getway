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

  private walletAddress = ENVIRONMENT.WALLET_ADDRESS;

  private USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';

  private provider = new ethers.JsonRpcProvider(
   //  'https://eth-mainnet.g.alchemy.com/v2/XP302vYQy17Ra53jsYeSdXdQMKiqxB0K',
   'https://rpc.ankr.com/bsc/aa28c69d077e55ed537ee5b470ae39f2104813370664499c21768f371260d242'
  );

  private wsProvider = new ethers.WebSocketProvider(
    'wss://bsc-rpc.publicnode.com'
  );

  private abi = [
    'event Transfer(address indexed from, address indexed to, uint256 value)',
  ];

  private contract = new ethers.Contract(
    this.USDT_CONTRACT,
    this.abi,
    this.wsProvider,
  );

  // =========================
  // INIT
  // =========================

  onModuleInit() {
    this.startListener();
    this.startBackfill(); // fallback polling
  }

  // =========================
  // REAL-TIME LISTENER (BEST)
  // =========================

  private startListener() {
    this.logger.log('Starting BSC real-time listener...');

    this.contract.on(
      'Transfer',
      async (from, to, value, event) => {
        try {
          const txHash = event.log.transactionHash;

          // only incoming to our wallet
          if (to.toLowerCase() !== this.walletAddress.toLowerCase()) return;

          const amount = ethers.formatUnits(value, 18);

          await this.txModel.updateOne(
            { txHash },
            {
              $setOnInsert: {
                from,
                to,
                amount,
                txHash,
                blockNumber: event.log.blockNumber,
                status: 'CONFIRMED',
                webhookStatus: 'PENDING',
              },
            },
            { upsert: true },
          );

          this.logger.log(
            `BSC TX ${txHash} | ${from} -> ${to} | ${amount} USDT`,
          );
        } catch (err) {
          this.logger.error('Listener error', err);
        }
      },
    );
  }

  // =========================
  // BACKUP INDEXER (POLL LOGS)
  // =========================

  private isRunning = false;

  private async startBackfill() {
    setInterval(() => this.runBackfill(), 20000);
  }

  private async runBackfill() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const latest = await this.provider.getBlockNumber();

      const tracker = await this.getTracker();
      let lastBlock = tracker.lastProcessedBlock || latest - 10;

      if (lastBlock >= latest) return;

      const logs = await this.provider.getLogs({
        address: this.USDT_CONTRACT,
        fromBlock: lastBlock + 1,
        toBlock: Math.min(lastBlock + 50, latest),
        topics: [
          ethers.id('Transfer(address,address,uint256)'),
        ],
      });

      for (const log of logs) {
        const parsed = this.contract.interface.parseLog(log);
        if (!parsed || !parsed.args) continue;

        const from = parsed.args.from;
        const to = parsed.args.to;
        const value = parsed.args.value;

        if (to.toLowerCase() !== this.walletAddress.toLowerCase()) continue;

        const txHash = log.transactionHash;

        const amount = ethers.formatUnits(value, 18);

        await this.txModel.updateOne(
          { txHash },
          {
            $setOnInsert: {
              from,
              to,
              amount,
              txHash,
              blockNumber: log.blockNumber,
              status: 'CONFIRMED',
              webhookStatus: 'PENDING',
            },
          },
          { upsert: true },
        );

        this.logger.log(
          `BACKFILL TX ${txHash} | ${amount} USDT`,
        );
      }

      await this.updateLastBlock(
        Math.min(lastBlock + 50, latest),
      );
    } catch (err) {
      this.logger.error('Backfill error', err);
    } finally {
      this.isRunning = false;
    }
  }

  // =========================
  // TRACKER (same idea as TRON)
  // =========================

  private async getTracker() {
    return (
      (await this.blockTrackerModel.findOne({ chain: 'bsc' })) || {
        lastProcessedBlock: 0,
      }
    );
  }

  private async updateLastBlock(blockNumber: number) {
    await this.blockTrackerModel.updateOne(
      { chain: 'bsc' },
      { lastProcessedBlock: blockNumber },
      { upsert: true },
    );
  }
}