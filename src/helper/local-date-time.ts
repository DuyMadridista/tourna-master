// import { format, parse, addDays, subDays, addMinutes, subMinutes, addHours, subHours, isValid, parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

// export class LocalDate {
//   private date: Date;

//   constructor(dateString: string) {
//     this.date = parse(dateString, 'yyyy-MM-dd', new Date());
//     if (!isValid(this.date)) throw new Error('Invalid LocalDate format');
//   }

//   static now(): LocalDate {
//     return new LocalDate(format(new Date(), 'yyyy-MM-dd'));
//   }

//   toString(): string {
//     return format(this.date, 'yyyy-MM-dd');
//   }

//   plusDays(days: number): LocalDate {
//     return new LocalDate(format(addDays(this.date, days), 'yyyy-MM-dd'));
//   }

//   minusDays(days: number): LocalDate {
//     return new LocalDate(format(subDays(this.date, days), 'yyyy-MM-dd'));
//   }

//   until(other: LocalDate): number {
//     return differenceInDays(other.date, this.date);
//   }

//   isBefore(other: LocalDate): boolean {
//     return this.date < other.date;
//   }

//   isAfter(other: LocalDate): boolean {
//     return this.date > other.date;
//   }
// }

// export class LocalTime {
//   private time: Date;

//   constructor(timeString: string) {
//     this.time = parse(timeString, 'HH:mm:ss', new Date());
//     if (!isValid(this.time)) throw new Error('Invalid LocalTime format');
//   }

//   static now(): LocalTime {
//     return new LocalTime(format(new Date(), 'HH:mm:ss'));
//   }

//   toString(): string {
//     return format(this.time, 'HH:mm:ss');
//   }

//   plusMinutes(minutes: number): LocalTime {
//     return new LocalTime(format(addMinutes(this.time, minutes), 'HH:mm:ss'));
//   }

//   minusMinutes(minutes: number): LocalTime {
//     return new LocalTime(format(subMinutes(this.time, minutes), 'HH:mm:ss'));
//   }

//   plusHours(hours: number): LocalTime {
//     return new LocalTime(format(addHours(this.time, hours), 'HH:mm:ss'));
//   }

//   minusHours(hours: number): LocalTime {
//     return new LocalTime(format(subHours(this.time, hours), 'HH:mm:ss'));
//   }

//   isBefore(other: LocalTime): boolean {
//     return this.time < other.time;
//   }

//   isAfter(other: LocalTime): boolean {
//     return this.time > other.time;
//   }
// }

// export class LocalDateTime {
//   private dateTime: Date;

//   constructor(dateTimeString: string) {
//     this.dateTime = parseISO(dateTimeString);
//     if (!isValid(this.dateTime)) throw new Error('Invalid LocalDateTime format');
//   }

//   static now(): LocalDateTime {
//     return new LocalDateTime(new Date().toISOString());
//   }

//   toString(): string {
//     return this.dateTime.toISOString();
//   }

//   toFormattedString(): string {
//     return format(this.dateTime, 'yyyy-MM-dd HH:mm:ss');
//   }

//   plusDays(days: number): LocalDateTime {
//     return new LocalDateTime(addDays(this.dateTime, days).toISOString());
//   }

//   minusDays(days: number): LocalDateTime {
//     return new LocalDateTime(subDays(this.dateTime, days).toISOString());
//   }

//   plusHours(hours: number): LocalDateTime {
//     return new LocalDateTime(addHours(this.dateTime, hours).toISOString());
//   }

//   minusHours(hours: number): LocalDateTime {
//     return new LocalDateTime(subHours(this.dateTime, hours).toISOString());
//   }

//   plusMinutes(minutes: number): LocalDateTime {
//     return new LocalDateTime(addMinutes(this.dateTime, minutes).toISOString());
//   }

//   minusMinutes(minutes: number): LocalDateTime {
//     return new LocalDateTime(subMinutes(this.dateTime, minutes).toISOString());
//   }

//   until(other: LocalDateTime): number {
//     return differenceInHours(other.dateTime, this.dateTime);
//   }

//   isBefore(other: LocalDateTime): boolean {
//     return this.dateTime < other.dateTime;
//   }

//   isAfter(other: LocalDateTime): boolean {
//     return this.dateTime > other.dateTime;
//   }
// }
