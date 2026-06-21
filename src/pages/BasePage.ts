import { Page, Locator } from '@playwright/test';
import { env } from '../config/env';

/**
 * Shared page-object behavior. Keeps navigation/utility logic in one place.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(url: string = env.baseUrl): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  /** Parse a "$89.99" style string into a number. */
  protected parseMoney(text: string | null): number {
    if (!text) return NaN;
    const cleaned = text.replace(/[^0-9.\-]/g, '');
    return Number(cleaned);
  }

  /** Wait helper that asserts on a condition instead of a static sleep. */
  protected async waitVisible(locator: Locator): Promise<void> {
    await locator.waitFor({ state: 'visible' });
  }
}
