import { ConflictException, Controller, Post, Query } from '@nestjs/common';
import { BscPollingService } from './bsc-polling.service';
import { TronPollingService } from './tron-polling.service';
import { ENVIRONMENT } from 'src/common/constant/enivronment/enviroment';

@Controller('polling')
export class PollingController {
   constructor(
      private readonly bscPollingService: BscPollingService,
      private readonly tronPollingService: TronPollingService
   ) {}

   adminPassword = ENVIRONMENT.ADMIN.PASSWORD

   @Post('admin/reset-indexer')
   async restIndexer(@Query('password') password: string, @Query('chain') chain: string){
      if (password !== this.adminPassword){
         throw new ConflictException('Incorrect Admin password')
      }

      if (chain === 'bsc') return this.bscPollingService.resetIndexer();
      else if(chain === 'tron') return this.tronPollingService
      else throw new ConflictException('Invalid chain type; indicate tron or bsc')
   }
}
