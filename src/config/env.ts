/**
 * Environment-based configuration.
 * Override any value via env vars so the same suite runs locally and in CI
 * without code changes (retry-safe, environment-agnostic).
 */
export const env = {
  baseUrl:
    process.env.BASE_URL ?? 'https://qa-practice.razvanvancea.ro/auth_ecommerce.html',
  headless: (process.env.HEADLESS ?? 'true').toLowerCase() !== 'false',
  // Slow-mo is useful for local debugging; keep 0 for CI speed.
  slowMo: Number(process.env.SLOW_MO ?? 0),
  // Default action/navigation timeout (ms).
  timeout: Number(process.env.TEST_TIMEOUT ?? 15000),
  // Browser engine: chromium | firefox | webkit
  browser: (process.env.BROWSER ?? 'chromium') as 'chromium' | 'firefox' | 'webkit',

  // --- API testing (qa-practice-api, Spring Boot) ---
  // Default matches the documented Docker port mapping (-p8887:8081).
  apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:8887',
  // Per-request API timeout (ms).
  apiTimeout: Number(process.env.API_TIMEOUT ?? 10000),
  // Soft SLA used by the response-time assertion (ms).
  apiSlaMs: Number(process.env.API_SLA_MS ?? 2000),
};
