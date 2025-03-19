export class CommonHelper {
  static validatePageAndSize(page: number, size: number): void {
    if (page < 0 || size <= 0) {
      throw new Error(
        'Page must be greater than or equal to zero, and size must be greater than zero',
      );
    }
  }

  static convertTimeStringToDate(date: Date, time: string): Date {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      seconds,
    );
  }
}
