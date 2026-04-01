import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TronPollingService } from './tron-polling.service';
import { CreateTronPollingDto } from './dto/create-tron-polling.dto';
import { UpdateTronPollingDto } from './dto/update-tron-polling.dto';

@Controller('tron-polling')
export class TronPollingController {
  constructor(private readonly tronPollingService: TronPollingService) {}
}
