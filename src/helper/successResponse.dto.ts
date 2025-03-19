import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto<T> {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 1 })
  total: number;
  @ApiProperty({ example: 'Request was successful' })
  message: string;

  @ApiProperty()
  data: T;

  @ApiProperty()
  additionalData?: any;

  constructor(
    statusCode: number,
    success: boolean,
    total: number,
    data: T,
    message: string,
    additionalData?: any,
  ) {
    this.success = success;
    this.total = total;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.additionalData = additionalData;
  }
}
