import { IsObject, ValidateNested, IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { Match} from '../../match/entities/match.entity';

export class ResponseChangeMatch {
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => Match)
  data: { [key: number]: Match[] }; 
}
