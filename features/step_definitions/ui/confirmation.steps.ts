import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import {
  credentials,
  orderItems,
  validAddress,
  expectedAddressLine,
  mismatchedCountry,
  addressWithCommaStreet,
  ShippingAddress,
} from '../../../src/fixtures/testData';

/** Log in, add the standard order, and submit shipping with the given address. */
async function placeOrder(world: CustomWorld, address: ShippingAddress): Promise<void> {
  await world.login.open();
  await world.login.login(credentials.valid.email, credentials.valid.password);
  await world.shop.waitLoaded();
  for (const { product, quantity } of orderItems) {
    await world.shop.addItem(product.name, quantity);
  }
  await world.shop.proceedToCheckout();
  await world.shipping.waitLoaded();
  await world.shipping.fill(address);
  world.state.submittedAddressLine = expectedAddressLine(address);
  await world.shipping.submit();
  await world.confirmation.waitLoaded();
}

Given(
  'the shopper has placed an order with valid shipping details',
  async function (this: CustomWorld) {
    await placeOrder(this, validAddress);
  },
);

Given(
  'the shopper places an order shipping to the mismatched-value country',
  async function (this: CustomWorld) {
    await placeOrder(this, { ...validAddress, country: mismatchedCountry.label });
  },
);

Given(
  'the shopper places an order with a comma in the street',
  async function (this: CustomWorld) {
    await placeOrder(this, addressWithCommaStreet);
  },
);

Then(
  'the confirmation address should be displayed as {string}',
  async function (this: CustomWorld, _format: string) {
    // _format is documentation ("Street, City - Country").
    // The real expected value is built from the data actually submitted.
    const expected = expectedAddressLine(validAddress);
    const actual = await this.confirmation.getShippingAddress();
    // Assertion: address concatenation matches "Street, City - Country" exactly.
    expect(actual).toBe(expected);
  },
);

Then(
  'the confirmation order total should equal {float}',
  async function (this: CustomWorld, expected: number) {
    expect(await this.confirmation.getOrderTotal()).toBeCloseTo(expected, 2);
  },
);

Then(
  'the confirmation country should be the human-readable label',
  async function (this: CustomWorld) {
    const actual = await this.confirmation.getCountry();
    this.attach(
      `Country shown: "${actual}" | expected label: "${mismatchedCountry.label}" | ` +
        `option value: "${mismatchedCountry.value}"`,
      'text/plain',
    );
    // KNOWN ISSUE: app echoes the misspelled option value instead of the label.
    expect(actual).toBe(mismatchedCountry.label);
  },
);

Then(
  'the confirmation address should match the submitted {string}',
  async function (this: CustomWorld, _format: string) {
    const expected = this.state.submittedAddressLine ?? '';
    const actual = await this.confirmation.getShippingAddress();
    // Assertion: a comma inside the street must not corrupt the address format.
    expect(actual).toBe(expected);
  },
);
