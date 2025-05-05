import got, { ExtendOptions, Got } from 'got';

interface HttpRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  body?: unknown;
  queryParams?: Record<string, string | number>;
  headers?: Record<string, string>;
}

class GotClient {
  client: Got;

  constructor(options?: ExtendOptions) {
    this.client = got.extend({
      responseType: 'json',
      timeout: { request: 300 },
      ...options,
    });
  }

  async request<T>(options: HttpRequestOptions) {
    return this.client<T>(options.url, {
      method: options.method,
      json: options.body,
      searchParams: options.queryParams,
      headers: options.headers,
    });
  }
}

export const gotClient = new GotClient();
