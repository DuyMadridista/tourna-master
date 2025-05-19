import { google } from 'googleapis';
import * as fs from 'fs';
import * as readline from 'readline';
import { BadRequestException } from '@nestjs/common';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CREDENTIALS_PATH = 'client_secret2.json';
const TOKEN_PATH = 'token.json';

export class GoogleCalendarHelper {
  private static oAuth2Client;

  static async init() {
    if (this.oAuth2Client) return;

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    if (fs.existsSync(TOKEN_PATH)) {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      this.oAuth2Client.setCredentials(token);
      this.oAuth2Client.on('tokens', (tokens: any) => {
        if (tokens.refresh_token || tokens.access_token) {
          fs.writeFileSync(TOKEN_PATH, JSON.stringify({
            ...this.oAuth2Client.credentials,
            ...tokens,
          }));
          console.log('🔄 Token đã được cập nhật');
        }
      });      
    } else {
      const authUrl = this.oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });

      console.log('Mở URL sau trong trình duyệt và dán mã xác thực:\n', authUrl);

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      await new Promise<void>((resolve) => {
        rl.question('Nhập mã xác thực: ', async (code) => {
          rl.close();
          const { tokens } = await this.oAuth2Client.getToken(code);
          this.oAuth2Client.setCredentials(tokens);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
          console.log('✅ Token đã lưu thành công');
          resolve();
        });
      });
    }
  }

  static async createEvent(
    summary: string,
    description: string,
    startDateTime: string,
    endDateTime: string,
    attendeesEmails: string[],
  ) {
    if (!this.oAuth2Client) {
      throw new Error('GoogleCalendarHelper chưa được init. Gọi init() trước.');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });

    const event = {
      summary,
      description,
      start: { dateTime: startDateTime, timeZone: 'Asia/Ho_Chi_Minh' },
      end: { dateTime: endDateTime, timeZone: 'Asia/Ho_Chi_Minh' },
      attendees: attendeesEmails.map((email) => ({ email })),
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });

    return res.data;
  }

  static async updateGoogleCalendarEvent(eventId: string, startTime: string, endTime: string, summary: string, description: string, attendeesEmails: string[]) {
    if (!this.oAuth2Client) {
      throw new Error('GoogleCalendarHelper chưa được init. Gọi init() trước.');
    }

    const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });

    const updatedEvent = {
      summary,
      description,
      start: {
        dateTime: startTime,
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Asia/Ho_Chi_Minh',
      },
      attendees: attendeesEmails.map((email) => ({ email })),
    };

    try {
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId, // ID sự kiện từ Google Calendar
        requestBody: updatedEvent,
      });

      return response.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật sự kiện trên Google Calendar:', error);
      throw new BadRequestException(error);
    }
  }
  static async deleteEvent(eventId: string): Promise<void> {
    if (!this.oAuth2Client) {
      throw new Error('GoogleCalendarHelper chưa được init. Gọi init() trước.');
    }
    if (!eventId) {
     return;
    }
    const calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });
  
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
      console.log(`Sự kiện với ID ${eventId} đã được xóa.`);
    } catch (error) {
      console.error(`Không thể xóa sự kiện với ID ${eventId}:`, error);
      throw new BadRequestException(error);
    }
  }
  
}
