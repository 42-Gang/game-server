import { describe, expect, it } from 'vitest';
import { HttpClient } from '../../../../src/plugins/http/interface/http.client.interface';
import { gotClient } from '../../../../src/plugins/http/got/http.client';

describe('HTTP Client', () => {
  it('GET jsonplaceholder.typicode.com', async () => {
    const httpClient: HttpClient = gotClient;

    const result = await httpClient.request({
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/1',
    });

    expect(result.body.userId).toBe(1);
  });

  it('POST jsonplaceholder.typicode.com', async () => {
    const httpClient: HttpClient = gotClient;

    const result = await httpClient.request({
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      body: {
        userId: 1,
        id: 3,
        title: 'jungslee ',
        body: 'new post',
      },
    });

    expect(result.statusCode).toBe(201);
  });

  it('PUT jsonplaceholder.typicode.com', async () => {
    const httpClient: HttpClient = gotClient;

    const result = await httpClient.request({
      method: 'PUT',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      body: {
        id: 1,
        title: 'foo',
        body: 'bar',
        userId: 1,
      },
    });

    expect(result.statusCode).toBe(200);
  });

  it('DELETE jsonplaceholder.typicode.com', async () => {
    const httpClient: HttpClient = gotClient;

    const result = await httpClient.request({
      method: 'DELETE',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
    });

    expect(result.statusCode).toBe(200);
  });
});
