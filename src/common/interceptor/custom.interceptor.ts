import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ClassConstructor {
  new (...arg: any[]): {};
}
export const Serialize = (dto: ClassConstructor) => {
  return UseInterceptors(new CustomClassInterceptor(dto));
};

export class CustomClassInterceptor implements NestInterceptor {
  constructor(private readonly dto: any) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        if (Array.isArray(data)) {
          return data.map((item) =>
            plainToInstance(this.dto, item, { excludeExtraneousValues: true }),
          );
        }
        return plainToInstance(this.dto, data, {
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}
