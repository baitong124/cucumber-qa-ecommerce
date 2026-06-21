import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { credentials, lineTotal, round2, catalogue } from '../../../src/fixtures/testData';

Given('the shopper is logged in and on the shopping cart', async function (this: CustomWorld) {
  await this.login.open();
  await this.login.login(credentials.valid.email, credentials.valid.password);
  await this.shop.waitLoaded();
});

When(
  'the shopper adds {string} with quantity {int}',
  async function (this: CustomWorld, item: string, qty: number) {
    await this.shop.addItem(item, qty);
  },
);

When(
  'the shopper changes the quantity of {string} to {int}',
  async function (this: CustomWorld, item: string, qty: number) {
    await this.shop.setQuantity(item, qty);
  },
);

When('the shopper proceeds to checkout', async function (this: CustomWorld) {
  await this.shop.proceedToCheckout();
});

When(
  'the shopper changes the quantity of {string} to {string}',
  async function (this: CustomWorld, item: string, qty: string) {
    await this.shop.setQuantityRaw(item, qty);
  },
);

When(
  'the shopper removes {string} from the cart',
  async function (this: CustomWorld, item: string) {
    await this.shop.removeItem(item);
  },
);

Then(
  'the cart should contain {int} distinct items',
  async function (this: CustomWorld, count: number) {
    expect(await this.shop.rowCount()).toBe(count);
  },
);

Then(
  'the quantity of {string} should be {int}',
  async function (this: CustomWorld, item: string, qty: number) {
    expect(await this.shop.getRowQuantity(item)).toBe(qty);
  },
);

Then(
  'the line total for {string} should equal price times quantity',
  async function (this: CustomWorld, item: string) {
    // Compute expected from the live catalogue price x the live row quantity,
    // then assert the cart total reflects exactly that single line.
    const unitPrice = await this.shop.getRowPrice(item);
    const qty = await this.shop.getRowQuantity(item);
    const expected = lineTotal(unitPrice, qty);
    expect(await this.shop.getCartTotal()).toBeCloseTo(expected, 2);
  },
);

Then(
  'the cart total should equal {float}',
  async function (this: CustomWorld, expected: number) {
    expect(await this.shop.getCartTotal()).toBeCloseTo(expected, 2);
  },
);

Then('the cart total should equal the sum of all line totals', async function (this: CustomWorld) {
  // Independently recompute from each row (price x qty) and compare to the UI total.
  let expected = 0;
  for (const product of Object.values(catalogue)) {
    if ((await this.shop.rowCount()) === 0) break;
    const rows = this.page.locator('.cart-items .cart-row');
    const titles = await rows.locator('.cart-item-title').allInnerTexts();
    if (!titles.some((t) => t.includes(product.name))) continue;
    const price = await this.shop.getRowPrice(product.name);
    const qty = await this.shop.getRowQuantity(product.name);
    expected += price * qty;
  }
  expect(await this.shop.getCartTotal()).toBeCloseTo(round2(expected), 2);
});

Then('the shipping details form should be displayed', async function (this: CustomWorld) {
  await this.shipping.waitLoaded();
  await expect(this.page.locator('#submitOrderBtn')).toBeVisible();
});

Then(
  'the shipping details form should not be displayed',
  async function (this: CustomWorld) {
    // KNOWN ISSUE: empty-cart checkout currently DOES reach the shipping form.
    await expect(this.page.locator('#submitOrderBtn')).not.toBeVisible();
  },
);

Then('the cart total should be a valid non-negative number', async function (this: CustomWorld) {
  const total = await this.shop.getCartTotal();
  // Catches the NaN / "$NaN" class of bug and negative totals (revenue risk).
  expect(Number.isFinite(total), 'cart total is not a finite number').toBe(true);
  expect(total).toBeGreaterThanOrEqual(0);
});

Then(
  'the cart behavior for a duplicate add should be recorded',
  async function (this: CustomWorld) {
    const rows = await this.shop.rowCount();
    const qty = await this.shop.getRowQuantityRaw("Dior J'adore").catch(() => 'n/a');
    this.attach(
      `Duplicate add of "Dior J'adore": rows=${rows}, quantity field="${qty}" ` +
        `(${rows === 1 ? 'MERGED into one row' : 'created a SECOND row'})`,
      'text/plain',
    );
  },
);
