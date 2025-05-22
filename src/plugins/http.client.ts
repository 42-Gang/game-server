import got, { ExtendOptions, Got } from 'got';
import type FormData from 'form-data';

interface BaseRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  queryParams?: Record<string, string | number>;
  headers?: Record<string, string>;
  throwHttpErrors?: boolean;
}

interface JsonRequestOptions<T extends object = object> extends BaseRequestOptions {
  body?: T;
}

interface FormRequestOptions extends BaseRequestOptions {
  body: FormData;
}

export class GotClient {
  client: Got;

  constructor(options?: ExtendOptions) {
    this.client = got.extend({
      responseType: 'json',
      timeout: { request: 300 },
      ...options,
    });
  }

  async requestForm<T>(options: FormRequestOptions) {
    return this.client<T>(options.url, {
      method: options.method,
      body: options.body,
      searchParams: options.queryParams,
      headers: options.headers,
      throwHttpErrors: options.throwHttpErrors ?? false,
    });
  }

  async requestJson<T>(options: JsonRequestOptions) {
    return this.client<T>(options.url, {
      method: options.method,
      json: options.body,
      searchParams: options.queryParams,
      headers: options.headers,
      throwHttpErrors: options.throwHttpErrors || false,
    });
  }
}

export const gotClient = new GotClient({
  get throwHttpErrors() {
    return false;
  },
});
