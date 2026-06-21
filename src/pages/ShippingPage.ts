import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { ShippingAddress } from '../fixtures/testData';

/**
 * Step 3 — Shipping Details.
 * Verified DOM (form#shippingForm, onsubmit="return false"):
 *   #phone (name=phone, required)
 *   input[name="street"] (required)
 *   input[name="city"] (required)
 *   #countries_dropdown_menu (name=country, required, <select>)
 *   #submitOrderBtn ("Submit Order")
 * All four fields use native HTML5 `required`, so an incomplete form is blocked
 * by the browser and never produces a confirmation message.
 */
export class ShippingPage extends BasePage {
  private readonly phone: Locator;
  private readonly street: Locator;
  private readonly city: Locator;
  private readonly country: Locator;
  private readonly submitBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.phone = page.locator('#phone');
    this.street = page.locator('input[name="street"]');
    this.city = page.locator('input[name="city"]');
    this.country = page.locator('#countries_dropdown_menu');
    this.submitBtn = page.locator('#submitOrderBtn');
  }

  async waitLoaded(): Promise<void> {
    await this.waitVisible(this.submitBtn);
  }

  /** Fill only the provided fields; omit a key to leave it empty (negative tests). */
  async fill(address: Partial<ShippingAddress>): Promise<void> {
    if (address.phone !== undefined) await this.phone.fill(address.phone);
    if (address.street !== undefined) await this.street.fill(address.street);
    if (address.city !== undefined) await this.city.fill(address.city);
    if (address.country !== undefined) {
      await this.country.selectOption({ label: address.country });
    }
  }

  async submit(): Promise<void> {
    await this.submitBtn.click();
  }

  async isOnShippingForm(): Promise<boolean> {
    return this.submitBtn.isVisible();
  }

  /** Whole-form native validity — false if any required field is empty. */
  async isFormValid(): Promise<boolean> {
    return this.page
      .locator('#shippingForm')
      .evaluate((form: HTMLFormElement) => form.checkValidity());
  }

  /** Validity of a single field by its name attribute. */
  async isFieldValid(field: 'phone' | 'street' | 'city' | 'country'): Promise<boolean> {
    return this.page
      .locator(`[name="${field}"]`)
      .evaluate((el: HTMLInputElement | HTMLSelectElement) => el.checkValidity());
  }
}
