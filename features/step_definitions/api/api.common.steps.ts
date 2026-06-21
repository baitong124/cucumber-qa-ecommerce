import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { env } from '../../../src/config/env';

/** Parse a comma-separated "200, 404" status list into numbers. */
function parseStatuses(list: string): number[] {
  return list
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n));
}

Then('the response status should be {int}', function (this: CustomWorld, expected: number) {
  // Assertion: exact HTTP status. Body is attached on failure for triage.
  expect(this.api.status, `body: ${this.api.text}`).toBe(expected);
});

Then(
  'the response status should be one of {string}',
  function (this: CustomWorld, list: string) {
    const allowed = parseStatuses(list);
    expect(allowed, `body: ${this.api.text}`).toContain(this.api.status);
  },
);

Then('the response content type should be JSON', function (this: CustomWorld) {
  const ct = this.api.response?.headers()['content-type'] ?? '';
  expect(ct).toContain('application/json');
});

Then(
  'the response body should contain a generated {string}',
  function (this: CustomWorld, key: string) {
    const body = this.api.body as Record<string, unknown> | undefined;
    expect(body, 'expected a JSON object body').toBeTruthy();
    expect(body?.[key], `expected "${key}" in response`).toBeDefined();
  },
);

Then(
  'the response body should have fields {string}',
  function (this: CustomWorld, fields: string) {
    const expected = fields.split(',').map((f) => f.trim());
    const body = this.api.body as Record<string, unknown> | undefined;
    expect(body, 'expected a JSON object body').toBeTruthy();
    for (const field of expected) {
      expect(body, `missing field "${field}"`).toHaveProperty(field);
    }
  },
);

Then('the response time should be within the configured SLA', function (this: CustomWorld) {
  expect(this.api.elapsedMs ?? Infinity).toBeLessThanOrEqual(env.apiSlaMs);
});
