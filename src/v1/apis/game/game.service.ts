import { TypeOf, z } from 'zod';
import { STATUS } from '../../common/constants/status.js';

import TournamentRepositoryInterface from '../../storage/database/interfaces/tournament.repository.interface.js';
import { getHistoryParamsSchema, getHistoryResponseSchema } from './schemas/get-history.schema.js';

export default class GameService {
  constructor(
    private readonly tournamentRepository: TournamentRepositoryInterface,
    // MatchRepository
    // PlayerListRepository
  ) {}

  async getHistory(
    userId: number,
    params: z.infer<typeof getHistoryParamsSchema>,
  ): Promise<TypeOf<typeof getHistoryResponseSchema>> {
    console.log('repo: ', this.tournamentRepository);

    return {
      status: STATUS.SUCCESS,
      message: '친구 요청을 보냈습니다.',
    };
  }
}
