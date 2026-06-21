import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import {
  credentials,
  orderItems,
  validAddress,
  ShippingAddress,
} from '../../../src/fixtures/testData';

type FieldName = 'phone' | 'street' | 'city' | 'country';

async function loginAddItemsAndCheckout(world: CustomWorld): Promise<void> {
  await world.login.open();
  await world.login.login(credentials.valid.email, credentials.valid.password);
  await world.shop.waitLoaded();
  for (const { product, quantity } of orderItems) {
    await world.shop.addItem(product.name, quantity);
  }
  await world.shop.proceedToCheckout();
  await world.shipping.waitLoaded();
}

Given(
  'the shopper has the required items in the cart and is on the shipping details form',
  async function (this: CustomWorld) {
    await loginAddItemsAndCheckout(this);
  },
);

When('the shopper fills in all shipping fields with valid data', async function (this: CustomWorld) {
  await this.shipping.fill(validAddress);
});

When(
  'the shopper fills the shipping form but leaves {string} empty',
  async function (this: CustomWorld, missing: FieldName) {
    // Build an address with every field except the omitted one.
    const partial: Partial<ShippingAddress> = { ...validAddress };
    delete partial[missing];
    await this.shipping.fill(partial);
  },
);

When('the shopper submits the order with an empty shipping form', async function (this: CustomWorld) {
  // Submit without filling anything.
  await this.shipping.submit();
});

When('the shopper fills every shipping field with only spaces', async function (this: CustomWorld) {
  // Country must be a real selection so we isolate the text-field whitespace bypass.
  await this.shipping.fill({
    phone: '   ',
    street: '   ',
    city: '   ',
    country: validAddress.country,
  });
});

When(
  'the shopper fills the shipping form with phone {string} and otherwise valid data',
  async function (this: CustomWorld, phone: string) {
    await this.shipping.fill({ ...validAddress, phone });
  },
);

When(
  'the shopper fills the shipping form with a 500-character street',
  async function (this: CustomWorld) {
    await this.shipping.fill({ ...validAddress, street: 'A'.repeat(500) });
  },
);

When(
  'the shopper fills the street with a script payload and otherwise valid data',
  async function (this: CustomWorld) {
    // Trap any dialog the payload might trigger (it must NOT fire).
    this.state.dialogFired = false;
    this.page.on('dialog', async (dialog) => {
      this.state.dialogFired = true;
      await dialog.dismiss();
    });
    await this.shipping.fill({ ...validAddress, street: '<script>alert(1)</script>' });
  },
);

When('the shopper submits the order', async function (this: CustomWorld) {
  await this.shipping.submit();
});

Then('the order confirmation should be displayed', async function (this: CustomWorld) {
  await this.confirmation.waitLoaded();
  await expect(this.page.locator('#message')).toBeVisible();
});

Then('the order confirmation should not be displayed', async function (this: CustomWorld) {
  await expect(this.page.locator('#message').first()).not.toContainText('Congrats');
});

Then('the shipping details form should still be visible', async function (this: CustomWorld) {
  await expect(this.page.locator('#submitOrderBtn')).toBeVisible();
});

Then(
  'the {string} field should be invalid',
  async function (this: CustomWorld, field: FieldName) {
    // Assertion: the omitted required field reports HTML5 invalidity.
    expect(await this.shipping.isFieldValid(field)).toBe(false);
  },
);

Then('the shipping form should be invalid', async function (this: CustomWorld) {
  expect(await this.shipping.isFormValid()).toBe(false);
});

Then(
  'it should be recorded that the phone field has no format validation',
  async function (this: CustomWorld) {
    // The order went through with a non-numeric phone -> document the gap.
    this.attach(
      'Finding: phone field (type=tel, required only) accepts non-numeric input. ' +
        'Recommend adding a pattern/format constraint.',
      'text/plain',
    );
  },
);

Then('no browser dialog should have been triggered', function (this: CustomWorld) {
  // Assertion: the script payload was rendered as text, not executed.
  expect(this.state.dialogFired ?? false).toBe(false);
});
