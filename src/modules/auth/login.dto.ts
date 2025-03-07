import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'Email của người dùng' })
    email: string;
  
    @ApiProperty({ example: 'password123', description: 'Mật khẩu của người dùng' })
    password: string;
  }