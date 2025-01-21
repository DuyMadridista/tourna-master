import { PartialType } from '@nestjs/mapped-types';
import { CreateTournamentDto } from './create-tournament.dto';
import { User } from 'src/modules/user/entities/user.entity';

export class UpdateTournamentDto extends PartialType(CreateTournamentDto) {
      organizers: User[];
      // function to validate request
      validateRequest() {

      }
}
