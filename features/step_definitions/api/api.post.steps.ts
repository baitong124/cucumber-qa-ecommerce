import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import {
  apiContract,
  validEmployee,
  extractFieldErrors,
  findByEmail,
  EmployeePayload,
} from '../../../src/fixtures/apiData';

const { fields, messages } = apiContract;

// --- Actions -------------------------------------------------------------

When('I create an employee with valid data', async function (this: CustomWorld) {
  const payload = validEmployee();
  this.api.createdPayload = payload as Record<string, unknown>;
  // NOTE: POST 201 returns an empty body, so there is no id to capture here.
  await this.capture(() => this.employees.create(payload));
});

When('I create an employee with valid data without a dob', async function (this: CustomWorld) {
  const payload = validEmployee();
  delete (payload as Record<string, unknown>)[fields.dob];
  await this.capture(() => this.employees.create(payload));
});

When('I create an employee with dob {string}', async function (this: CustomWorld, dob: string) {
  await this.capture(() => this.employees.create(validEmployee({ [fields.dob]: dob })));
});

When('I create an employee with first name {string}', async function (this: CustomWorld, name: string) {
  await this.capture(() => this.employees.create(validEmployee({ [fields.firstName]: name })));
});

When('I create an employee with email {string}', async function (this: CustomWorld, email: string) {
  await this.capture(() => this.employees.create(validEmployee({ email })));
});

When(
  'I create an employee missing the {string} field',
  async function (this: CustomWorld, field: string) {
    const payload = validEmployee();
    delete (payload as Record<string, unknown>)[field];
    await this.capture(() => this.employees.create(payload));
  },
);

When('I create an employee with all fields blank', async function (this: CustomWorld) {
  await this.capture(() =>
    this.employees.create({
      [fields.firstName]: '',
      [fields.lastName]: '',
      [fields.email]: '',
    } as EmployeePayload),
  );
});

When('I send a malformed JSON body to create an employee', async function (this: CustomWorld) {
  // Deliberately broken JSON (unclosed brace).
  await this.capture(() => this.employees.createRaw('{"firstName": "Jane", '));
});

When('I create an employee with an empty JSON object', async function (this: CustomWorld) {
  await this.capture(() => this.employees.create({}));
});

When(
  'I send a create request with content type {string}',
  async function (this: CustomWorld, contentType: string) {
    await this.capture(() =>
      this.employees.createRaw(JSON.stringify(validEmployee()), contentType),
    );
  },
);

Given('an employee already exists with a known email', async function (this: CustomWorld) {
  const payload = validEmployee();
  this.api.knownEmail = payload.email as string;
  await this.capture(() => this.employees.create(payload));
});

When('I create another employee with the same email', async function (this: CustomWorld) {
  await this.capture(() =>
    this.employees.create(validEmployee({ email: this.api.knownEmail })),
  );
});

/** Sentinel id a client tries (and must fail) to assign via the request body. */
const FORCED_ID = 999999999;

When('I create an employee with valid data plus an unknown field', async function (this: CustomWorld) {
  const payload = validEmployee({ unexpectedField: 'x' });
  this.api.createdPayload = payload as Record<string, unknown>;
  await this.capture(() => this.employees.create(payload));
});

When('I create an employee with a forced {string}', async function (this: CustomWorld, field: string) {
  const value = field === 'id' ? FORCED_ID : 'forced-value';
  const payload = validEmployee({ [field]: value });
  this.api.createdPayload = payload as Record<string, unknown>;
  await this.capture(() => this.employees.create(payload));
});

When('I create an employee with a 1000-character first name', async function (this: CustomWorld) {
  await this.capture(() =>
    this.employees.create(validEmployee({ [fields.firstName]: 'A'.repeat(1000) })),
  );
});

When(
  'I send a {string} request to the employees collection',
  async function (this: CustomWorld, method: string) {
    const verb = method.toLowerCase() as 'put' | 'patch' | 'delete' | 'head';
    await this.capture(() => this.employees.sendVerb(verb, validEmployee()));
  },
);

// --- Assertions ----------------------------------------------------------

Then('the response body should be empty', function (this: CustomWorld) {
  // Verified: POST 201 returns no body.
  expect((this.api.text ?? '').trim()).toBe('');
});

Then(
  'the created employee should be retrievable from the list by email',
  async function (this: CustomWorld) {
    const email = String(this.api.createdPayload?.[fields.email] ?? '');
    const res = await this.employees.list();
    const list = await res.json().catch(() => undefined);
    const found = findByEmail(list, email);
    // Assertion: creation persisted (verified via GET list, since POST returns no body).
    expect(found, `created employee with email was not found in the list`).toBeTruthy();
    if (found?.id !== undefined) this.api.createdId = found.id as string | number;
  },
);

/** Resolve a just-created record from the live list by its (unique) email. */
async function resolveByEmail(
  world: CustomWorld,
  email: string,
): Promise<Record<string, unknown> | undefined> {
  const res = await world.employees.list();
  const list = await res.json().catch(() => undefined);
  return findByEmail(list, email);
}

Then('only one employee should exist with that email', async function (this: CustomWorld) {
  const email = String(this.api.knownEmail ?? '');
  const res = await this.employees.list();
  const list = await res.json().catch(() => undefined);
  const matches = Array.isArray(list)
    ? (list as Array<Record<string, unknown>>).filter((e) => e.email === email)
    : [];
  // Uniqueness must hold at the data layer, not just in the HTTP status.
  expect(matches.length, `expected exactly 1 record for ${email}, found ${matches.length}`).toBe(1);
});

Then('the created employee should not expose the unknown field', async function (this: CustomWorld) {
  const email = String(this.api.createdPayload?.[fields.email] ?? '');
  const found = await resolveByEmail(this, email);
  expect(found, `created employee not found (email ${email})`).toBeTruthy();
  const res = await this.employees.getById(found!.id as string | number);
  const body = await res.json().catch(() => ({}));
  // The client-sent junk key must never be reflected/persisted.
  expect(body, 'unknown field must not be persisted').not.toHaveProperty('unexpectedField');
});

Then('the stored id should not be the forced value', async function (this: CustomWorld) {
  const email = String(this.api.createdPayload?.[fields.email] ?? '');
  const found = await resolveByEmail(this, email);
  expect(found, `created employee not found (email ${email})`).toBeTruthy();
  // Mass-assignment guard: the server assigns the id, not the client.
  expect(Number(found!.id), 'client-supplied id must be ignored').not.toBe(FORCED_ID);
});

/** Shared helper: assert a field's error message contains the expected text. */
function expectFieldMessage(world: CustomWorld, field: string, expected: string): void {
  const errors = extractFieldErrors(world.api.body);
  const match = errors.find((e) => e.field === field);
  expect(match, `no validation error for "${field}" in ${world.api.text}`).toBeTruthy();
  const msg = match?.defaultMessage ?? match?.message ?? '';
  expect(msg).toContain(expected);
}

Then(
  'the validation error for field {string} should have the invalid-email message',
  function (this: CustomWorld, field: string) {
    expectFieldMessage(this, field, messages.invalidEmail);
  },
);

Then(
  'the validation error for field {string} should have the mandatory message',
  function (this: CustomWorld, field: string) {
    expectFieldMessage(this, field, messages.mandatory[field] ?? 'mandatory');
  },
);

Then(
  'the validation error for field {string} should have the size message',
  function (this: CustomWorld, field: string) {
    expectFieldMessage(this, field, messages.sizeRange);
  },
);

Then(
  'the validation errors should include fields {string}',
  function (this: CustomWorld, fieldList: string) {
    const expectedFields = fieldList.split(',').map((f) => f.trim());
    const errors = extractFieldErrors(this.api.body);
    const reported = new Set(errors.map((e) => e.field));
    for (const field of expectedFields) {
      expect(reported.has(field), `field "${field}" not reported in ${this.api.text}`).toBe(true);
    }
  },
);

Then(
  'the email {string} should be {string}',
  function (this: CustomWorld, _email: string, outcome: string) {
    if (outcome === 'accepted') {
      expect(this.api.status).toBe(apiContract.status.created);
    } else {
      expect(this.api.status).toBe(apiContract.status.badRequest);
    }
  },
);

