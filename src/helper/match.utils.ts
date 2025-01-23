import { Injectable } from '@nestjs/common';
import { MatchDto } from '../modules/match/dto/MatchDto';  // Import MatchDto
import { Match } from '../modules/match/entities/match.entity';  // Import Match entity

@Injectable()
export class MatchUtils {

  convertMatchtoMatchDTO(match: Match): MatchDto {
    const matchDTO = new MatchDto();
    matchDTO.id = match.id;
    matchDTO.startTime = match.startTime;
    matchDTO.endTime = match.endTime;
    matchDTO.title = match.title;
    // Convert other properties as needed
    return matchDTO;
  }

  convertMatchToMatchDto(matches: Match[]): MatchDto {
    return matches
      .map(this.convertMatchtoMatchDTO)  // Map each Match to MatchDto
      .sort((a, b) => a.startTime.localeCompare(b.startTime));  // Sort by startTime (assuming startTime is a string)
  }

}
