# QA Automation Portfolio — E-commerce Checkout Suite

> **Interview showcase project.** A production-style BDD automation suite built to
> demonstrate test design, automation architecture, and risk-based QA thinking — not
> just a passing test run.

End-to-end coverage of the **Login → Shop → Shipping → Confirmation** flow on a live
demo app (`https://qa-practice.razvanvancea.ro/auth_ecommerce.html`).

Stack: **Cucumber-JS 10** · **Playwright 1.45** · **TypeScript 5** · Page Object Model · data-driven fixtures.

---

## What this project demonstrates

For a reviewer, the suite is evidence of the following competencies:

- **Both UI and API layers** — a browser-driven E2E suite *and* a pure-HTTP REST suite
  (`@api`) that validates the backend contract independently of the UI.
- **Test design technique** — equivalence partitioning, boundary-value analysis,
  negative and edge probing, security input checks, and session/state validation,
  applied deliberately rather than only happy-path scripting (see [Test coverage](#test-coverage)).
- **Risk-based prioritization** — scenarios are tagged (`@smoke`, `@positive`,
  `@negative`, `@known-issue`) so the critical revenue path can be gated independently.
- **Maintainable automation architecture** — Page Object Model, a per-scenario World
  for isolation, data-driven fixtures, and environment-based config with zero hardcoded
  values in the steps.
- **BDD that reads as specification** — Gherkin features double as living documentation
  of the application contract.
- **CI-readiness & diagnostics** — a parallel/retry CI profile, plus auto-captured
  screenshots and Playwright traces on failure for fast triage.
- **Defect awareness** — real app bugs are encoded as `@known-issue` scenarios that
  assert the *desired* behavior, so they surface as findings instead of silent passes.

---

## Quick start

```bash
npm install
npx playwright install chromium   # one-time browser download
npm test                          # run the whole suite (headless)
```

Useful variants:

| Command | Purpose |
|---|---|
| `npm run test:smoke` | `@smoke` critical path only |
| `npm run test:positive` | positive scenarios |
| `npm run test:negative` | negative / validation scenarios |
| `npm run test:headed` | run with a visible browser |
| `npm run typecheck` | TypeScript type check (no execution) |
| `npx cucumber-js --dry-run` | verify every step is wired (no browser) |
| `npx cucumber-js -p ci` | CI profile: 2 workers, 1 retry |

Reports land in `reports/` (`cucumber-report.html`, `cucumber-report.json`).
On failure, a full-page screenshot is attached to the HTML report and a Playwright
trace (`reports/trace-*.zip`) is saved — open with `npx playwright show-trace <file>`.

### Environment overrides (no code changes needed)

| Var | Default | Notes |
|---|---|---|
| `BASE_URL` | live QA Practice URL | point at another env |
| `HEADLESS` | `true` | `false` to watch |
| `BROWSER` | `chromium` | `firefox` \| `webkit` |
| `SLOW_MO` | `0` | ms delay for debugging |
| `TEST_TIMEOUT` | `15000` | per-action / navigation timeout (ms) |
| `RECORD_VIDEO` | unset | `true` to record videos → `reports/videos/` |

---

## Project structure

```
features/
  ui/                           UI scenarios (login → cart → shipping → confirmation)
    01_login.feature              Step 1 — login
    02_cart_total.feature         Step 2 — items + total calculation
    03_shipping_details.feature   Step 3 — required-field validation
    04_order_confirmation.feature Step 4 — address display
  api/                          API scenarios
    get_employee_by_id.feature
    post_employees.feature
  step_definitions/
    ui/                         thin UI steps → call page objects
    api/                        API steps → call EmployeeApiClient
  support/                      World (per-scenario state) + hooks (browser, trace, screenshots)
src/
  config/env.ts                 environment-based config
  api/EmployeeApiClient.ts      API client wrapper
  fixtures/                     testData.ts (UI), apiData.ts (API contract + helpers)
  pages/                        LoginPage, ShopPage, ShippingPage, ConfirmationPage, BasePage
reports/                        generated output (gitignored; .gitkeep preserves the folder)
cucumber.cjs                    runner config (default + ci profiles)
```

---

## Verified application contract (captured from the live app)

| Area | Detail |
|---|---|
| Login | `#email`, `#password`, `#submitLoginBtn`; creds `admin@admin.com` / `admin123` |
| Product card | `.shop-item` → `.shop-item-title`, `.shop-item-price`, `button.shop-item-button` |
| Cart row | `.cart-row` → `.cart-item-title`, `.cart-price`, `input.cart-quantity-input` |
| Cart total | `.cart-total-price`; checkout `button.btn-purchase` |
| Shipping | `#phone`, `input[name=street]`, `input[name=city]`, `#countries_dropdown_menu`, `#submitOrderBtn` — all `required` (native HTML5 validation) |
| Confirmation | `<div id="message">` → `…order of $TOTAL… shipped to Street, City - Country.` |

**Quantity mechanic:** each `ADD TO CART` click creates one row; quantity is changed by
editing the row's number input (not by clicking add repeatedly). The page objects model this.

---

## Test coverage

### Step 1 — Login (`@login`)
| ID | Tag | Scenario | Expected |
|---|---|---|---|
| TC-01 | positive, smoke | Valid credentials | Cart displayed |
| TC-02 | negative | Wrong password | Cart not shown, form stays |
| TC-03 | negative | Unknown email | Cart not shown, form stays |
| TC-04 | negative | Empty credentials | Email field invalid, cart not shown |
| TC-04b | negative | Password only empty | Password field invalid |
| TC-04c | negative | Email only empty | Email field invalid |
| TC-04d | edge | Password case-sensitive (`Admin123`) | Cart not shown |
| TC-04e | edge | Trailing space in password | Cart not shown |
| TC-04f | security | `<script>` in email | Email field invalid |
| TC-04g | edge, session | Refresh after login | Session not kept → login form |

### Step 2 — Cart & total (`@cart`)
| ID | Tag | Scenario | Expected |
|---|---|---|---|
| TC-05 | positive, smoke | Add Dior×2 + Gucci×3 | 2 rows, qty 2 & 3 |
| TC-06 | positive | Line total = price × qty (outline) | 179.98 / 239.97 |
| TC-07 | positive, smoke | Grand total = Σ line totals | **419.95** |
| TC-08 | positive | Live recalculation on qty change | 179.98 → 269.97 |
| TC-09 | edge | Large quantity (×100) | 7999.00 (also probes any qty cap) |
| TC-10 | positive | Proceed to checkout | Shipping form shown |
| TC-09b | edge, validation | Qty `0 / -1 / "" / abc` (outline) | Total stays finite & ≥ 0 |
| TC-09c | edge, validation | Decimal qty `1.5 / 2.9 / 0.1` (outline) | Rejected — qty stays 1, total 89.99 |
| TC-09d | edge | Add same product twice | Behavior recorded (merge vs 2 rows) |
| TC-09e | negative, state | Remove an item | Recalculates to 239.97 |
| TC-09f | **known-issue** | Checkout with empty cart | Should block (currently does NOT) |

### Step 3 — Shipping validation (`@shipping`)
| ID | Tag | Scenario | Expected |
|---|---|---|---|
| TC-11 | positive, smoke | All fields valid | Confirmation shown |
| TC-12–15 | negative | One required field empty (phone/street/city/country, outline) | Submit blocked, field invalid |
| TC-16 | negative | All fields empty | Submit blocked, form invalid |
| TC-16b | **known-issue** | Whitespace-only fields | Should reject (native `required` accepts spaces) |
| TC-16c | edge | Non-numeric phone | Submits — no format validation (recorded) |
| TC-16d | edge | 500-char street | Handled without crash |
| TC-16e | security | `<script>` in street | Rendered as text, no dialog fires |

### Step 4 — Confirmation (`@confirmation`)
| ID | Tag | Scenario | Expected |
|---|---|---|---|
| TC-17 | positive, smoke | Address format | Exactly `Street, City - Country` |
| TC-18 | positive | Order total | 419.95 |
| TC-18b | **known-issue** | Country with mismatched option value | Should show label `United Arab Emirates` (shows value `…Erimates`) |
| TC-18c | edge | Comma inside street | Address format not corrupted |
| TC-18d | edge, session | Refresh confirmation page | Order state not preserved |

---

## Calculation under test

| Item | Unit | Qty | Line |
|---|---|---|---|
| Dior J'adore | 89.99 | 2 | 179.98 |
| Gucci Bloom Eau de | 79.99 | 3 | 239.97 |
| **Total** | | | **419.95** |

Totals are asserted with 2-decimal tolerance (`toBeCloseTo`) and independently
recomputed from each row, so the test fails if the app's own math drifts.

---

## API testing (`@api`) — backend contract coverage

A separate REST suite for the `qa-practice-api` employee service, driven by Playwright's
`APIRequestContext` (pure HTTP, **no browser**). It runs independently of the UI and
demonstrates API-layer QA skills alongside the E2E flow.

```bash
# start the API, then:
npm run test:api      # @api scenarios only  (default http://localhost:8887)
npm run test:ui       # UI-only run
```

If the API isn't reachable, every `@api` scenario **skips** with a clear hint instead of hanging.

**Contract verified live** against `/v2/api-docs` + real requests, then centralized in
`src/fixtures/apiData.ts` (camelCase fields, `@NotBlank`/`@Size(3,30)`/`@Email` rules,
empty-body `201`, plain-text `404`). What the suite covers:

| Area | Representative checks |
|---|---|
| Happy path | valid `POST` → `201`; `GET /{id}` → `200` with correct schema |
| Field validation | invalid email, missing/blank required fields, size boundaries (`<3`, `>30`) |
| Boundary & format | email boundary set, invalid `dob` format, non-numeric / out-of-range ids |
| Robustness | malformed JSON, empty `{}`, wrong `Content-Type` → `4xx`, **never `500`** |
| Data integrity | duplicate email → `409` (no second record); mass-assignment guard on reserved `id` |
| Round-trip & SLA | create → resolve id → read back consistently; response under `API_SLA_MS` |

> ⚠️ API tests **create real data** (unique email per run). Point `API_BASE_URL` at a
> disposable/local instance — never production.

Env vars: `API_BASE_URL` (default `http://localhost:8887`), `API_TIMEOUT` (10000), `API_SLA_MS` (2000).

---

## Design decisions (the "why")

A short tour of the engineering choices, framed the way they'd be discussed in a review:

- **Page Object Model over inline selectors** — UI selectors live in one place per page,
  so a markup change is a one-file fix instead of a suite-wide hunt. Steps stay readable
  and intention-revealing.
- **Per-scenario World, not shared state** — each scenario gets a fresh browser context
  and its own state, eliminating cross-test contamination and order dependence. This is
  what makes parallel execution safe.
- **Data-driven fixtures** — credentials, catalogue, and expected totals are centralized;
  totals are *recomputed* from source data rather than hardcoded, so a pricing change in
  one place updates every assertion.
- **Environment-based config** — `BASE_URL`, `BROWSER`, `HEADLESS`, timeouts, etc. are all
  overridable without touching code, so the same suite runs locally, headed for debugging,
  or in CI against any environment.
- **Deterministic assertions, no static sleeps** — waits are tied to actual conditions
  (Playwright auto-waiting), avoiding the flakiness that fixed `sleep()` introduces.
- **Failures are diagnosable** — every failure auto-attaches a full-page screenshot and a
  Playwright trace, so a CI failure can be triaged from the artifact alone.
- **Known bugs are tests, not comments** — defects are captured as `@known-issue` scenarios
  asserting the correct behavior; run `--tags "not @known-issue"` for a clean release gate
  and `--tags @known-issue` to track the open findings.

