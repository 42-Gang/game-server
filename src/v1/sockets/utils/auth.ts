// utils/auth.ts
import { gotClient } from '../../../plugins/http.client.js';

export async function verifyAccessToken(token: string): Promise<boolean> {
  const response = await gotClient.request({
    method: 'POST',
    url: 'http://localhost:8080/api/v1/auth/token/verify',
    body: { access_token: token },
  });

  return response.statusCode === 200;
}
