import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from './user.repository';
import { CommonValidationService } from 'src/helper/common-validation';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserRepository]), TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService, CommonValidationService,    
    {
    provide: UserRepository, 
    useClass: UserRepository,
  },],
})
export class UserModule {}
