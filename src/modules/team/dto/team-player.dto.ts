export class TeamPlayerDto {
  constructor(
    public teamId: number,
    public teamName: string,
    public tier: number,
    public group: string,
    public leaderName: string,
    public leaderEmail: string,
    public leaderPhoneNumber: string,
    public playerCount: number,
  ) {}
}
