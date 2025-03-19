export class EventDateAdditionalDto {
  id: number;
  numMatch: number;

  constructor(id: number, numMatch: number) {
    this.id = id;
    this.numMatch = numMatch;
  }
}
