
import { SuccessResponseDto } from './successResponse.dto';
import { HttpStatus } from '@nestjs/common';

export function SuccessResponse<T>(success: boolean, total : number, data: T,message: string, additionalData ?: any): SuccessResponseDto<T> {
  return new SuccessResponseDto<T>(HttpStatus.OK,success,total,data, message, additionalData);
}
