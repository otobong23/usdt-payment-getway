import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import axios from 'axios';
import { TronGridBaseUrl, TronPollingEndpoints } from 'src/common/constant/endpoints/API_Endpoints';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlockTracker, BlockTrackerDocument } from './schema/tron-polling.schema';
import { ENVIRONMENT } from 'src/common/constant/enivronment/enviroment';
import { TronTransaction, TronTransactionDocument } from './schema/tron-transactions.schema';
import { TronWeb } from 'tronweb';

@Injectable()
export class TronPollingService implements OnModuleInit {
  private readonly logger = new Logger(TronPollingService.name);
  constructor(
    @InjectModel(BlockTracker.name) private readonly blockTrackerModel: Model<BlockTrackerDocument>,
    @InjectModel(TronTransaction.name) private readonly txModel: Model<TronTransactionDocument>
  ) { }

  private walletAddress = ENVIRONMENT.WALLET_ADDRESS.USDT_TRC20

  private authFeth = axios.create({
    baseURL: TronGridBaseUrl,
    headers: {
      "Content-Type": "application/json",
      Authorization: ENVIRONMENT.TRON.API_KEY,
    },
    timeout: 30000,
  })

  formatUSDT(amount: string) {
    const big = BigInt(amount);
    const integer = big / 1000000n;
    const fraction = big % 1000000n;

    return `${integer}.${fraction.toString().padStart(6, '0')}`;
  }


  // 1. Get the latest block number
  async getLatestBlockNumber(): Promise<number> {
    const res = await this.authFeth.get(TronPollingEndpoints.getConfirmedNowBlock);

    return res.data.block_header.raw_data.number;
  }

  // 2. Get full block data by number
  async getBlockByNumber(blockNumber: number) {
    const res = await this.authFeth.post(TronPollingEndpoints.getConfirmedBlockByNum, {
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

  private decodeTRC20(data: string) {
    if (!data) return null;

    const clean = data.startsWith('0x') ? data.slice(2) : data;

    const method = clean.slice(0, 8);
    if (method !== 'a9059cbb') return null; // transfer()

    const toHex = clean.slice(8 + 24, 8 + 64); // last 20 bytes of first slot
    const amountHex = clean.slice(8 + 64, 8 + 128);

    const to = '41' + toHex; // TRON hex format
    const amount = BigInt('0x' + amountHex).toString();

    return { to, amount };
  }

  private tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    headers: { 'TRON-PRO-API-KEY': ENVIRONMENT.TRON.API_KEY }
  });

  private toBase58(hex: string) {
    return this.tronWeb.address.fromHex(hex);
  }

  onModuleInit() {
    this.startIndexer();
    // this.startConfirmer();
  }

  private startIndexer() {
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

        // await this.confirmTransactions(latestBlock);

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

    await Promise.all(
      block.transactions.map(tx => this.processTransaction(tx))
    );
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

      if (contract.type !== 'TriggerSmartContract') return;

      const value = contract.parameter.value;
      const txHash = tx.txID;

      // ✅ Ensure success
      if (tx.ret?.[0]?.contractRet !== 'SUCCESS') return;

      // ✅ Verify USDT contract
      const USDT_CONTRACT = ENVIRONMENT.TRON.USDT_CONTRACT; // base58 format
      const contractBase58 = this.toBase58(value.contract_address);
      if (contractBase58 !== USDT_CONTRACT) return;

      const decoded = this.decodeTRC20(value.data);
      if (!decoded) return;

      const to = this.toBase58(decoded.to);
      const from = this.toBase58(value.owner_address);

      // ✅ Only our wallet
      if (to !== this.walletAddress) return;

      const rawAmount = decoded.amount;
      const formattedAmount = this.formatUSDT(rawAmount);

      this.logger.log({ to, from, amount: formattedAmount })

      // ✅ Idempotent insert
      await this.txModel.updateOne(
        { txHash },
        {
          $setOnInsert: {
            from,
            to,
            amount: formattedAmount,
            blockNumber: tx.blockNumber,
            confirmAtBlock: tx.blockNumber + 19,
            //status: 'PENDING', // we can directly mark as CONFIRMED since we're using walletsolidity endpoints
            status: 'CONFIRMED',
            webhookStatus: 'PENDING'
          }
        },
        { upsert: true }
      );

      this.logger.log(`TX ${txHash} | ${from} -> ${to} | ${formattedAmount} USDT`);

    } catch (err) {
      this.logger.error('TX processing error', err);
    }
  }

  async resetIndexer() {
    const latest = await this.getLatestBlockNumber();
    const startBlock = latest - 20;

    await this.blockTrackerModel.deleteOne({ chain: 'tron' });

    await this.blockTrackerModel.create({
      chain: 'tron',
      lastProcessedBlock: startBlock,
    });

    return { message: 'Indexer reset', startBlock };
  }












  // Confirmation logic - used when using wallet endpoints to mark transactions as confirmed after 20 blocks. Not needed id using walletsolidity endpoints as they return already confirmed transactions.

  // private startConfirmer() {
  //   setInterval(() => this.runConfirmation(), 10000); // every 10s (tunable)
  // }

  // private isConfirming = false;

  // private async runConfirmation() {
  //   if (this.isConfirming) return;
  //   this.isConfirming = true;

  //   try {
  //     const latestBlock = await this.getLatestBlockNumber();
  //     await this.confirmTransactions(latestBlock);
  //   } catch (err) {
  //     this.logger.error('Confirmation error', err);
  //   } finally {
  //     this.isConfirming = false;
  //   }
  // }

  // private async confirmTransactions(latestBlock: number) {
  //   const CONFIRMATION_THRESHOLD = 19;
  //   const BATCH_SIZE = 100;

  //   const pendingTxs = await this.txModel.find({
  //     status: 'PENDING',
  //     blockNumber: { $lte: latestBlock - CONFIRMATION_THRESHOLD }
  //   })
  //     .limit(BATCH_SIZE);

  //   if (pendingTxs.length === 0) return;

  //   await this.txModel.bulkWrite(
  //     pendingTxs.map(tx => ({
  //       updateOne: {
  //         filter: { txHash: tx.txHash },
  //         update: { $set: { status: 'CONFIRMED' } }
  //       }
  //     }))
  //   );

  //   // process side effects after
  //   for (const tx of pendingTxs) {
  //     // await this.txModel.updateOne(
  //     //   { txHash: tx.txHash },
  //     //   { status: 'CONFIRMED' }
  //     // );

  //     //await this.sendWebhook(tx); // confirmed event
  //   }
  // }
}
