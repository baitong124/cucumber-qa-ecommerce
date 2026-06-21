import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Step 2 — Shop + Shopping Cart.
 * Verified DOM:
 *   Product card:  .shop-item > .shop-item-title
 *                  .shop-item-details > .shop-item-price + button.shop-item-button ("ADD TO CART")
 *   Cart row:      .cart-items > .cart-row
 *                    .cart-item-title | .cart-price | input.cart-quantity-input | button.btn-danger (REMOVE)
 *   Total:         .cart-total-price
 *   Checkout:      button.btn-purchase ("PROCEED TO CHECKOUT")
 *
 * Quantity is set by editing the row's number input (NOT by repeated ADD TO CART clicks).
 */
export class ShopPage extends BasePage {
  private readonly cartItems: Locator;
  private readonly cartTotal: Locator;
  private readonly checkoutBtn: Locator;

  constructor(page: Page) {
    super(page);
    this.cartItems = page.locator('.cart-items');
    this.cartTotal = page.locator('.cart-total-price');
    this.checkoutBtn = page.locator('button.btn-purchase');
  }

  /** A product card scoped by its visible title. */
  private productCard(name: string): Locator {
    return this.page.locator('.shop-item', {
      has: this.page.locator('.shop-item-title', { hasText: name }),
    });
  }

  /** The cart row for a product, scoped by its title. */
  private cartRow(name: string): Locator {
    return this.cartItems.locator('.cart-row', {
      has: this.page.locator('.cart-item-title', { hasText: name }),
    });
  }

  async waitLoaded(): Promise<void> {
    await this.waitVisible(this.checkoutBtn);
  }

  /** Catalogue unit price shown on the product card. */
  async getCatalogPrice(name: string): Promise<number> {
    const text = await this.productCard(name).locator('.shop-item-price').innerText();
    return this.parseMoney(text);
  }

  /** Add a product to the cart (creates a row with quantity 1). */
  async addToCart(name: string): Promise<void> {
    const row = this.cartRow(name);
    await this.productCard(name).locator('button.shop-item-button').click();
    await row.waitFor({ state: 'visible' });
  }

  /** Set the quantity for an already-added product and wait for the total to settle. */
  async setQuantity(name: string, qty: number): Promise<void> {
    const input = this.cartRow(name).locator('input.cart-quantity-input');
    await input.fill(String(qty));
    // App recalculates on the input's change event.
    await input.blur();
  }

  /** Add a product and set its quantity in one call. */
  async addItem(name: string, qty: number): Promise<void> {
    await this.addToCart(name);
    if (qty !== 1) await this.setQuantity(name, qty);
  }

  /**
   * Set a raw (possibly invalid) quantity string via real keyboard events so the
   * browser fires trusted input/change events — the same path a real user takes.
   */
  async setQuantityRaw(name: string, value: string): Promise<void> {
    const input = this.cartRow(name).locator('input.cart-quantity-input');
    await input.click({ clickCount: 3 });
    await this.page.keyboard.type(value);
    await input.blur();
  }

  async getRowPrice(name: string): Promise<number> {
    const text = await this.cartRow(name).locator('.cart-price').innerText();
    return this.parseMoney(text);
  }

  async getRowQuantity(name: string): Promise<number> {
    const value = await this.cartRow(name).locator('input.cart-quantity-input').inputValue();
    return Number(value);
  }

  async getCartTotal(): Promise<number> {
    return this.parseMoney(await this.cartTotal.innerText());
  }

  async rowCount(): Promise<number> {
    return this.cartItems.locator('.cart-row').count();
  }

  /** Remove a product row via its REMOVE button. */
  async removeItem(name: string): Promise<void> {
    await this.cartRow(name).locator('button.btn-danger').click();
  }

  /** Raw text of the quantity input (lets tests inspect what the field accepted). */
  async getRowQuantityRaw(name: string): Promise<string> {
    return this.cartRow(name).locator('input.cart-quantity-input').inputValue();
  }

  /** True when the shipping form (next step) is rendered. */
  async isShippingFormVisible(): Promise<boolean> {
    return this.page.locator('#submitOrderBtn').isVisible();
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutBtn.click();
  }
}
