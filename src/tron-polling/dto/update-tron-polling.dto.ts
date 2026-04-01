import { PartialType } from '@nestjs/mapped-types';
import { CreateTronPollingDto } from './create-tron-polling.dto';

export class UpdateTronPollingDto extends PartialType(CreateTronPollingDto) {}
