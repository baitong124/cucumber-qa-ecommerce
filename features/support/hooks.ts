import {
  Before,
  After,
  AfterAll,
  setDefaultTimeout,
  Status,
  ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { chromium, firefox, webkit, Browser, request as pwRequest } from '@playwright/test';
import { CustomWorld } from './world';
import { env } from '../../src/config/env';
import { EmployeeApiClient } from '../../src/api/EmployeeApiClient';

// Generous default so slow-network scenarios don't false-fail.
setDefaultTimeout(Number(env.timeout) + 15000);

const engines = { chromium, firefox, webkit };

// Browser is launched lazily so an @api-only run never needs a browser installed.
let browser: Browser | undefined;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await engines[env.browser].launch({
      headless: env.headless,
      slowMo: env.slowMo,
    });
  }
  return browser;
}

// ---------------------------------------------------------------------------
// UI scenarios (everything that is NOT tagged @api)
// ---------------------------------------------------------------------------
Before({ tags: 'not @api' }, async function (this: CustomWorld) {
  this.browser = await getBrowser();
  // New context per scenario → clean cookies/storage, no cross-test bleed.
  this.context = await this.browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: process.env.RECORD_VIDEO === 'true' ? { dir: 'reports/videos' } : undefined,
  });
  await this.context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(env.timeout);
});

// ---------------------------------------------------------------------------
// API scenarios (@api) — no browser; isolated APIRequestContext per scenario.
// Skips gracefully (never hangs) if the local API service isn't running.
// ---------------------------------------------------------------------------
Before({ tags: '@api' }, async function (this: CustomWorld) {
  this.request = await pwRequest.newContext({
    baseURL: env.apiBaseUrl,
    timeout: env.apiTimeout,
    extraHTTPHeaders: { Accept: 'application/json' },
  });

  const reachable = await new EmployeeApiClient(this.request).isReachable();
  if (!reachable) {
    // eslint-disable-next-line no-console
    console.warn(
      `\n[skip] API not reachable at ${env.apiBaseUrl}. ` +
        `Start it with: docker run -d --rm -p8887:8081 rvancea/qa-practice-api:latest\n`,
    );
    return 'skipped' as const;
  }
});

// ---------------------------------------------------------------------------
// Teardown — handles both UI and API resources.
// ---------------------------------------------------------------------------
After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  const failed = scenario.result?.status === Status.FAILED;

  // UI artifacts on failure.
  if (this.page) {
    if (failed) {
      const png = await this.page.screenshot({ fullPage: true });
      this.attach(png, 'image/png');
      const safeName = scenario.pickle.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      await this.context.tracing.stop({ path: `reports/trace-${safeName}.zip` });
    } else if (this.context) {
      await this.context.tracing.stop();
    }
    await this.page.close();
    await this.context.close();
  }

  // API artifacts on failure: attach the raw response body for triage.
  if (this.request) {
    if (failed && this.api?.text) {
      this.attach(this.api.text, 'application/json');
    }
    await this.request.dispose();
  }
});

AfterAll(async function () {
  await browser?.close();
});
