import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/world';
import { credentials } from '../../../src/fixtures/testData';

Given('the shopper is on the login page', async function (this: CustomWorld) {
  await this.login.open();
});

When('the shopper logs in with valid credentials', async function (this: CustomWorld) {
  await this.login.login(credentials.valid.email, credentials.valid.password);
});

When('the shopper logs in with an incorrect password', async function (this: CustomWorld) {
  await this.login.login(credentials.wrongPassword.email, credentials.wrongPassword.password);
});

When('the shopper logs in with an unknown email', async function (this: CustomWorld) {
  await this.login.login(credentials.unknownUser.email, credentials.unknownUser.password);
});

When('the shopper submits the login form with empty credentials', async function (this: CustomWorld) {
  await this.login.login('', '');
});

When(
  'the shopper logs in with email {string} and password {string}',
  async function (this: CustomWorld, email: string, password: string) {
    await this.login.login(email, password);
  },
);

When('the shopper refreshes the page', async function (this: CustomWorld) {
  await this.login.reload();
});

Then('the shopping cart should be displayed', async function (this: CustomWorld) {
  await this.shop.waitLoaded();
  // Assertion: the checkout button only exists on the authenticated cart page.
  await expect(this.page.locator('button.btn-purchase')).toBeVisible();
});

Then('the shopping cart should not be displayed', async function (this: CustomWorld) {
  await expect(this.page.locator('button.btn-purchase')).not.toBeVisible();
});

Then('the login form should still be visible', async function (this: CustomWorld) {
  await expect(this.page.locator('#submitLoginBtn')).toBeVisible();
});

Then('the email field should be invalid', async function (this: CustomWorld) {
  // Assertion: native HTML5 required validation rejects the empty email field.
  expect(await this.login.isEmailValid()).toBe(false);
});

Then('the password field should be invalid', async function (this: CustomWorld) {
  expect(await this.login.isPasswordValid()).toBe(false);
});
