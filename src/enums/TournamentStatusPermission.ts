import { TournamentStatus } from '../enums/tournament-status.enum';

export class TournamentStatusPermission {
  // Trạng thái không được phép
  static readonly notAllowed: TournamentStatus[] = [TournamentStatus.DELETED];

  // Trạng thái cơ bản được phép (loại bỏ những trạng thái không được phép)
  static readonly allowedBasic: TournamentStatus[] = Object.values(
    TournamentStatus,
  ).filter(
    (status) =>
      !TournamentStatusPermission.notAllowed.includes(
        status as TournamentStatus,
      ),
  ) as TournamentStatus[];

  // Trạng thái nâng cao được phép
  static readonly allowedAdvance: TournamentStatus[] = [
    TournamentStatus.NEED_INFORMATION,
    TournamentStatus.READY,
    TournamentStatus.IN_PROGRESS,
  ];

  // Trạng thái được phép reset toàn bộ ngày sự kiện
  static readonly allowedResetAllEventDate: TournamentStatus[] = [
    TournamentStatus.NEED_INFORMATION,
  ];

  // Trạng thái được phép để tạo mới
  static readonly allowGenerateStatus: TournamentStatus[] = [
    TournamentStatus.READY,
    TournamentStatus.NEED_INFORMATION,
  ];
}
