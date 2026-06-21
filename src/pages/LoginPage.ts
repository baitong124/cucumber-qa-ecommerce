import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Step 1 — Login ("Login - Shop").
 * Verified DOM: #email, #password, #submitLoginBtn (form#login, onsubmit="return false").
 * The shop cart only renders after a successful login.
 */
export class LoginPage extends BasePage {
  private readonly email: Locator;
  private readonly password: Locator;
  private readonly submitBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.email = page.locator('#email');
    this.password = page.locator('#password');
    this.submitBtn = page.locator('#submitLoginBtn');
  }

  async open(): Promise<void> {
    await this.goto();
    await this.waitVisible(this.email);
  }

  async login(email: string, password: string): Promise<void> {
    // .fill() clears first, so empty-string inputs are honored for negative tests.
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submitBtn.click();
  }

  /** True while the login form is still on screen (used by negative login checks). */
  async isLoginFormVisible(): Promise<boolean> {
    return this.email.isVisible();
  }

  /** Native HTML5 validity of the email field — false when required+empty. */
  async isEmailValid(): Promise<boolean> {
    return this.email.evaluate((el: HTMLInputElement) => el.checkValidity());
  }

  /** Native HTML5 validity of the password field — false when required+empty. */
  async isPasswordValid(): Promise<boolean> {
    return this.password.evaluate((el: HTMLInputElement) => el.checkValidity());
  }

  /** Reload the page (used to verify session persistence behavior). */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }
}
