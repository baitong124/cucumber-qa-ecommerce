import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, APIRequestContext, APIResponse } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { ShopPage } from '../../src/pages/ShopPage';
import { ShippingPage } from '../../src/pages/ShippingPage';
import { ConfirmationPage } from '../../src/pages/ConfirmationPage';
import { EmployeeApiClient } from '../../src/api/EmployeeApiClient';

/**
 * Custom Cucumber World — one isolated instance per scenario.
 * Holds the Playwright objects plus lazily-created page objects so steps stay thin.
 * Cross-step shared values (e.g. the expected total computed in one step and
 * asserted in another) live in `state`.
 */
export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  // --- API testing context (only set for @api scenarios) ---
  request!: APIRequestContext;
  private _api?: EmployeeApiClient;

  // Lazily instantiated page objects.
  private _login?: LoginPage;
  private _shop?: ShopPage;
  private _shipping?: ShippingPage;
  private _confirmation?: ConfirmationPage;

  /** Scratchpad for values carried across steps within a scenario. */
  state: {
    expectedTotal?: number;
    expectedAddressLine?: string;
    /** Set true if a native JS dialog (alert/confirm) fired — XSS-execution check. */
    dialogFired?: boolean;
    /** Address actually submitted, for confirmation-format assertions. */
    submittedAddressLine?: string;
  } = {};

  /** Captured API exchange, shared across steps within a scenario. */
  api: {
    response?: APIResponse;
    status?: number;
    body?: unknown;
    text?: string;
    elapsedMs?: number;
    createdId?: string | number;
    /** Payload/body of an employee created earlier in the scenario (round-trip). */
    createdPayload?: Record<string, unknown>;
    createdBody?: unknown;
    /** Email reused by the duplicate-email scenario. */
    knownEmail?: string;
  } = {};

  constructor(options: IWorldOptions) {
    super(options);
  }

  get employees(): EmployeeApiClient {
    return (this._api ??= new EmployeeApiClient(this.request));
  }

  /**
   * Send a request, then capture status/body/text/timing into `this.api`
   * so assertion steps can read a single, consistent snapshot.
   */
  async capture(send: () => Promise<APIResponse>): Promise<void> {
    const start = Date.now();
    const response = await send();
    this.api.elapsedMs = Date.now() - start;
    this.api.response = response;
    this.api.status = response.status();
    this.api.text = await response.text();
    try {
      this.api.body = this.api.text ? JSON.parse(this.api.text) : undefined;
    } catch {
      this.api.body = undefined; // non-JSON body (kept in `text`)
    }
  }

  get login(): LoginPage {
    return (this._login ??= new LoginPage(this.page));
  }
  get shop(): ShopPage {
    return (this._shop ??= new ShopPage(this.page));
  }
  get shipping(): ShippingPage {
    return (this._shipping ??= new ShippingPage(this.page));
  }
  get confirmation(): ConfirmationPage {
    return (this._confirmation ??= new ConfirmationPage(this.page));
  }
}

setWorldConstructor(CustomWorld);
