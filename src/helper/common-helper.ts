import { google } from 'googleapis';
export class CommonHelper {
  static async createCalendarEvent({
    summary,
    description,
    startDateTime,
    endDateTime,
    attendeesEmails,
  }: {
    summary: string;
    description: string;
    startDateTime: string; // ISO string
    endDateTime: string;
    attendeesEmails: string[];
  }) {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'googlekey.json',
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary,
      description,
      start: { dateTime: startDateTime, timeZone: 'Asia/Ho_Chi_Minh' },
      end: { dateTime: endDateTime, timeZone: 'Asia/Ho_Chi_Minh' },
      attendees: attendeesEmails.map((email) => ({ email })),
    };

    await calendar.events.insert({
      calendarId: 'primary', // Hoặc Calendar ID cụ thể
      requestBody: event,
      sendUpdates: 'all',
    });
  }

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
