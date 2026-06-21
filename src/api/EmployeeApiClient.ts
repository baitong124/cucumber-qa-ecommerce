import { APIRequestContext, APIResponse } from '@playwright/test';
import { apiContract, EmployeePayload } from '../fixtures/apiData';

/**
 * Thin, reusable wrapper around Playwright's APIRequestContext for the
 * /api/v1/employees endpoints. Keeps step definitions declarative and means
 * the endpoint path / verbs live in exactly one place.
 *
 * Every method returns the raw APIResponse so steps can assert on status,
 * headers, timing, and body as needed.
 */
export class EmployeeApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly basePath: string = apiContract.basePath,
  ) {}

  /** POST a JSON employee. */
  async create(body: EmployeePayload): Promise<APIResponse> {
    return this.request.post(this.basePath, { data: body });
  }

  /** POST a raw string body with an explicit content-type (malformed JSON / wrong type tests). */
  async createRaw(rawBody: string, contentType = 'application/json'): Promise<APIResponse> {
    return this.request.post(this.basePath, {
      headers: { 'content-type': contentType },
      data: rawBody,
    });
  }

  /** GET a single employee by id. */
  async getById(id: string | number): Promise<APIResponse> {
    return this.request.get(`${this.basePath}/${id}`);
  }

  /** GET the full collection. */
  async list(): Promise<APIResponse> {
    return this.request.get(this.basePath);
  }

  /** PUT update an employee by id. */
  async updateById(id: string | number, body: EmployeePayload): Promise<APIResponse> {
    return this.request.put(`${this.basePath}/${id}`, { data: body });
  }

  /** DELETE an employee by id. */
  async deleteById(id: string | number): Promise<APIResponse> {
    return this.request.delete(`${this.basePath}/${id}`);
  }

  /** GET an arbitrary absolute path (used for /simulate/* endpoints). */
  async getAbsolute(path: string): Promise<APIResponse> {
    return this.request.get(path);
  }

  /** Send an arbitrary verb at the collection (method-not-allowed coverage). */
  async sendVerb(
    method: 'put' | 'patch' | 'delete' | 'head',
    body?: EmployeePayload,
  ): Promise<APIResponse> {
    return this.request.fetch(this.basePath, {
      method: method.toUpperCase(),
      data: body,
    });
  }

  /** Lightweight reachability probe for the @api Before hook. */
  async isReachable(): Promise<boolean> {
    try {
      const res = await this.request.get(`${this.basePath}/0`, { timeout: 3000 });
      // Any HTTP answer (even 404) means the service is up.
      return res.status() > 0;
    } catch {
      return false;
    }
  }
}
