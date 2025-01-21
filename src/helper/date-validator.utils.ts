import { Injectable } from '@nestjs/common';

@Injectable()
export class DateValidatorUtils {
  /**
   * Kiểm tra xem ngày được cung cấp có trước ngày hôm nay hay không
   * @param inputDate - Ngày cần kiểm tra
   * @returns true nếu ngày trước hôm nay, ngược lại false
   */
  static isBeforeToday(inputDate: Date): boolean {
    const today = new Date();
    // Xóa bỏ giờ, phút, giây để so sánh chỉ ngày
    const inputDateOnly = new Date(inputDate.setHours(0, 0, 0, 0));
    const todayOnly = new Date(today.setHours(0, 0, 0, 0));

    return inputDateOnly < todayOnly;
  }

  /**
   * Kiểm tra xem ngày được cung cấp có sau ngày hôm nay hay không
   * @param inputDate - Ngày cần kiểm tra
   * @returns true nếu ngày sau hôm nay, ngược lại false
   */
  static isAfterToday(inputDate: Date): boolean {
    const today = new Date();
    // Xóa bỏ giờ, phút, giây để so sánh chỉ ngày
    const inputDateOnly = new Date(inputDate.setHours(0, 0, 0, 0));
    const todayOnly = new Date(today.setHours(0, 0, 0, 0));

    return inputDateOnly > todayOnly;
  }
}
