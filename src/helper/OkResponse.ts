
import { SuccessResponseDto } from './successResponse.dto';
import { HttpStatus } from '@nestjs/common';

export function createSuccessResponse<T>(message: string, data: T): SuccessResponseDto<T> {
  return new SuccessResponseDto<T>(HttpStatus.OK, message, data);
}
