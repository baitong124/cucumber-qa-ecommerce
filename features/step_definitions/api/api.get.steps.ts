import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { apiContract, validEmployee, extractMessage, findByEmail } from '../../../src/fixtures/apiData';

const { fields, messages } = apiContract;

/** POST a unique employee, then resolve its id from the list (POST returns no id). */
async function createAndResolveId(world: CustomWorld): Promise<void> {
  const email = String(world.api.createdPayload?.[fields.email] ?? '');
  const res = await world.employees.list();
  const list = await res.json().catch(() => undefined);
  const found = findByEmail(list, email);
  expect(found?.id, `could not resolve created employee id (email ${email})`).toBeDefined();
  world.api.createdId = found!.id as string | number;
}

// --- Setup ---------------------------------------------------------------

Given('an employee exists', async function (this: CustomWorld) {
  const payload = validEmployee();
  this.api.createdPayload = payload as Record<string, unknown>;
  await this.capture(() => this.employees.create(payload));
  expect(this.api.status, `create failed: ${this.api.text}`).toBe(apiContract.status.created);
  await createAndResolveId(this);
});

Given('I resolve the created employee id from the list', async function (this: CustomWorld) {
  await createAndResolveId(this);
});

// --- Actions -------------------------------------------------------------

When('I get the employee by its id', async function (this: CustomWorld) {
  expect(this.api.createdId, 'no created id available').toBeDefined();
  await this.capture(() => this.employees.getById(this.api.createdId!));
});

When('I get the employee with id {string}', async function (this: CustomWorld, id: string) {
  await this.capture(() => this.employees.getById(id));
});

// --- Assertions ----------------------------------------------------------

Then(
  'the response message should be the not-found message for id {string}',
  function (this: CustomWorld, id: string) {
    const actual = extractMessage(this.api.body ?? this.api.text);
    // Assertion: exact 404 message (A6), e.g. "Employee not found with ID 99999999".
    expect(actual).toContain(messages.notFound(id));
  },
);

Then('the fetched employee should match the created employee', function (this: CustomWorld) {
  const sent = this.api.createdPayload ?? {};
  const body = this.api.body as Record<string, unknown> | undefined;
  expect(body, 'expected a JSON object body').toBeTruthy();
  for (const key of [fields.firstName, fields.lastName, fields.email]) {
    expect(body?.[key], `persisted "${key}" differs from created`).toBe(sent[key]);
  }
});
