import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class CommonValidationService {
  /**
   * Validate page and size parameters.
   * @param page Page number (must be >= 0)
   * @param size Page size (must be > 0)
   */
  validatePageAndSize(page: number, size: number): void {
    if (page < 0 || size <= 0) {
      throw new BadRequestException(
        'Page must be greater than or equal to zero, and size must be greater than zero',
      );
    }
  }

  /**
   * Escape special characters in a string.
   * @param keyword The string to escape.
   * @returns Escaped string.
   */
  escapeSpecialCharacters(keyword: string): string {
    const regex = /[%_]/g;
    return keyword.replace(regex, '\\$&');
  }
}
