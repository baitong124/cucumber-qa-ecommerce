/**
 * Single source of truth for the qa-practice-api (Spring Boot) employee contract.
 *
 * VERIFIED LIVE against http://localhost:8887 /v2/api-docs + real requests
 * (springfox / Swagger 2.0). Key facts:
 *   - Request/response fields are camelCase: firstName, lastName, email, dob (id read-only).
 *   - firstName/lastName: @NotBlank + @Size(min=3,max=30).
 *   - email: @NotBlank + @Email.
 *   - dob: optional ISO date (yyyy-MM-dd); bad format -> 400.
 *   - POST 201 returns an EMPTY body (no echo, no id, no Location header).
 *   - 400 body: { timestamp, status, error, errors[], message, path } where each
 *     errors[] item has { field, defaultMessage, ... }.
 *   - 404 body: PLAIN TEXT "Employee not found with ID {id}".
 *   - id path param is an integer; non-numeric -> 400.
 *   - PUT/DELETE success -> 204 (empty body); PUT/DELETE on missing id -> 404.
 *   - Main endpoints are NOT auth-protected; /simulate/get/employees requires a token (401).
 */

export const apiContract = {
  /** Endpoint path appended to env.apiBaseUrl. */
  basePath: '/api/v1/employees',

  /** Simulation endpoints (resilience / auth surface). */
  simulate: {
    serverError: '/api/v1/simulate/server/error', // -> 500
    protectedList: '/api/v1/simulate/get/employees', // -> 401 without token
    token: '/api/v1/simulate/token',
  },

  /** Request body field names (camelCase, verified). */
  fields: {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    dob: 'dob',
  },

  /** Field validation constraints (verified). */
  constraints: {
    nameMin: 3,
    nameMax: 30,
  },

  /** Expected server messages (verified live). */
  messages: {
    mandatory: {
      firstName: 'The first name is mandatory!',
      lastName: 'The last name is mandatory!',
      email: 'The email is mandatory!',
    } as Record<string, string>,
    invalidEmail: 'must be a well-formed email address',
    sizeRange: 'size must be between 3 and 30',
    notFound: (id: string | number): string => `Employee not found with ID ${id}`,
  },

  /** Expected HTTP status codes. */
  status: {
    ok: 200,
    created: 201,
    noContent: 204,
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    methodNotAllowed: 405,
    conflict: 409,
    unsupportedMediaType: 415,
    serverError: 500,
  },
} as const;

export type EmployeePayload = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  dob?: unknown;
  [k: string]: unknown;
};

/** A valid, unique employee payload (unique email avoids duplicate collisions). */
export function validEmployee(overrides: EmployeePayload = {}): EmployeePayload {
  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    email: `jane.doe.${unique}@example.com`,
    dob: '1990-01-01',
    ...overrides,
  };
}

/** Unique email helper for round-trip lookups. */
export function uniqueEmail(prefix = 'qa'): string {
  return `${prefix}.${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`;
}

export interface FieldError {
  field?: string;
  defaultMessage?: string;
  message?: string;
  [k: string]: unknown;
}

/**
 * Normalize the 400 validation body into a flat list of field errors.
 * Verified shape is { errors: [...] }; also tolerates a bare array or single object.
 */
export function extractFieldErrors(body: unknown): FieldError[] {
  if (Array.isArray(body)) return body as FieldError[];
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    if (Array.isArray(obj.errors)) return obj.errors as FieldError[];
    if (Array.isArray(obj.fieldErrors)) return obj.fieldErrors as FieldError[];
    if (obj.field || obj.defaultMessage || obj.message) return [obj as FieldError];
  }
  return [];
}

/** Pull a message out of a 404 body (verified: plain string; also tolerates JSON). */
export function extractMessage(body: unknown): string {
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    return String(obj.message ?? obj.error ?? obj.detail ?? '');
  }
  return '';
}

/** Find an employee in a list response by email. */
export function findByEmail(
  list: unknown,
  email: string,
): Record<string, unknown> | undefined {
  if (!Array.isArray(list)) return undefined;
  return (list as Array<Record<string, unknown>>).find((e) => e.email === email);
}

/**
 * Email boundary dataset for the data-driven validation outline (API-P07).
 * `valid: true` rows must be accepted (201); the rest must be rejected (400).
 */
export const emailBoundaryData: Array<{ email: string; valid: boolean; note: string }> = [
  { email: 'plainaddress', valid: false, note: 'no @ or domain' },
  { email: '@no-local.com', valid: false, note: 'missing local part' },
  { email: 'no-at-sign.com', valid: false, note: 'missing @' },
  { email: 'spaces in@email.com', valid: false, note: 'whitespace in local part' },
  { email: 'trailingdot@domain.', valid: false, note: 'domain ends with dot' },
  { email: 'valid@example.co', valid: true, note: 'minimal valid address' },
];
