/**
 * Centralized, data-driven test data.
 * Keeping data here (not hard-coded in steps) means new products/quantities
 * become a one-line change and the same scenarios stay reusable.
 */

export interface Product {
  /** Exact on-screen product title. */
  name: string;
  /** Unit price in the shop catalogue. */
  unitPrice: number;
}

export interface ShippingAddress {
  phone: string;
  street: string;
  city: string;
  /** Must match an <option> in the country dropdown. */
  country: string;
}

export const credentials = {
  valid: { email: 'admin@admin.com', password: 'admin123' },
  // For negative login coverage.
  wrongPassword: { email: 'admin@admin.com', password: 'wrong-pass-123' },
  unknownUser: { email: 'nobody@example.com', password: 'admin123' },
};

/** Catalogue prices verified against the live shop (2026-06). */
export const catalogue: Record<string, Product> = {
  dior: { name: "Dior J'adore", unitPrice: 89.99 },
  gucci: { name: 'Gucci Bloom Eau de', unitPrice: 79.99 },
};

/**
 * The order under test:
 *   Dior J'adore  x2
 *   Gucci Bloom   x3
 * Expected total = (89.99*2) + (79.99*3) = 419.95
 */
export const orderItems: Array<{ product: Product; quantity: number }> = [
  { product: catalogue.dior, quantity: 2 },
  { product: catalogue.gucci, quantity: 3 },
];

export const validAddress: ShippingAddress = {
  phone: '0812345678',
  street: '123 Sukhumvit Road',
  city: 'Bangkok',
  country: 'Thailand',
};

/** Round to 2 decimals to avoid floating-point noise in assertions. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Compute expected line total for a single item. */
export const lineTotal = (unitPrice: number, qty: number): number => round2(unitPrice * qty);

/** Compute expected cart grand total for the configured order. */
export const expectedCartTotal = (
  items = orderItems,
): number =>
  round2(items.reduce((sum, i) => sum + lineTotal(i.product.unitPrice, i.quantity), 0));

/** Address as rendered on the confirmation page: "Street, City - Country". */
export const expectedAddressLine = (a: ShippingAddress = validAddress): string =>
  `${a.street}, ${a.city} - ${a.country}`;

/**
 * A country whose dropdown <option> value differs from its visible label.
 * Verified live: selecting label "United Arab Emirates" sends value
 * "United Arab Erimates" (misspelled). The confirmation echoes the VALUE,
 * so the desired label is what a correct UI should display.
 */
export const mismatchedCountry = {
  label: 'United Arab Emirates',
  value: 'United Arab Erimates', // observed actual (defect)
};

/** A street containing a comma — must not break the "Street, City - Country" format. */
export const addressWithCommaStreet: ShippingAddress = {
  phone: '0812345678',
  street: '123, Sukhumvit Soi 4',
  city: 'Bangkok',
  country: 'Thailand',
};
