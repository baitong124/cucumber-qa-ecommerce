import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Step 4 — Order Confirmation.
 * Verified DOM: <div id="message">
 *   "Congrats! Your order of $TOTAL has been registered and will be shipped to STREET, CITY - COUNTRY."
 */
export class ConfirmationPage extends BasePage {
  private readonly message: Locator;

  constructor(page: Page) {
    super(page);
    this.message = page.locator('#message');
  }

  async waitLoaded(): Promise<void> {
    await this.message.waitFor({ state: 'visible' });
  }

  async getMessage(): Promise<string> {
    return (await this.message.innerText()).trim();
  }

  async isVisible(): Promise<boolean> {
    return this.message.isVisible();
  }

  /** Extract the total amount, e.g. 419.95 from "...order of $419.95 has been...". */
  async getOrderTotal(): Promise<number> {
    const text = await this.getMessage();
    const match = text.match(/\$([\d,]+(?:\.\d{1,2})?)/);
    return match ? Number(match[1].replace(/,/g, '')) : NaN;
  }

  /**
   * Extract the shipped-to address, i.e. everything after "shipped to ",
   * trimmed of the trailing period: "Street, City - Country".
   */
  async getShippingAddress(): Promise<string> {
    const text = await this.getMessage();
    const match = text.match(/shipped to\s+(.+?)\.?\s*$/i);
    return match ? match[1].trim() : '';
  }

  /** The country segment of the address (text after the final " - "). */
  async getCountry(): Promise<string> {
    const address = await this.getShippingAddress();
    const parts = address.split(' - ');
    return (parts[parts.length - 1] ?? '').trim();
  }
}
