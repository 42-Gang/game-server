import { gotClient } from '../../../plugins/http.client.js';
import { UnAuthorizedException } from '../../common/exceptions/core.error.js';

export async function verifyAccessToken(token: string): Promise<{
  status: number;
  userId: string;
}> {
  const response = await gotClient.requestJson({
    method: 'POST',
    url: `http://${process.env.AUTH_SERVER_URL}/api/v1/auth/validate-token`,
    headers: {
      'x-internal': 'true',
      authorization: `Bearer ${token}`,
    },
  });

  if (response.headers['x-authenticated'] === undefined) {
    throw new UnAuthorizedException('');
  }

  if (response.headers['x-authenticated'] !== 'true') {
    throw new UnAuthorizedException('');
  }

  const userId = response.headers['x-user-id'];
  if (Array.isArray(userId) || userId === undefined) {
    throw new UnAuthorizedException('');
  }

  return {
    status: response.statusCode,
    userId,
  };
}
