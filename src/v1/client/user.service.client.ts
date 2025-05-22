import { GotClient } from '../../plugins/http.client.js';
import { HttpException } from '../common/exceptions/core.error.js';

export default class UserServiceClient {
  constructor(
    private readonly httpClient: GotClient,
    private readonly userServerUrl: string,
  ) {}

  async getUserInfo(userId: number) {
    const response = await this.httpClient.requestJson<{
      data: {
        id: number;
        nickname: string;
        avatarUrl: string;
      };
      message: string;
    }>({
      url: `http://${this.userServerUrl}/api/v1/users/${userId}`,
      method: 'GET',
      headers: {
        'x-internal': 'true',
        'x-authenticated': 'true',
        'x-user-id': userId.toString(),
      },
    });

    if (response.statusCode !== 200) {
      throw new HttpException(response.statusCode, response.body.message);
    }

    const user = response.body.data;

    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    };
  }
}
