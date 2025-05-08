import { FastifyReply, FastifyRequest } from 'fastify';
// import GameService from './game.service.js';
// import { getHistoryParamsSchema } from './schemas/get-history.schema.js';

export default class GameController {
  // constructorconstructor(private readonly gameService: GameService) {}

  getHistory = async (request: FastifyRequest, reply: FastifyReply) => {
    //   const params = getHistoryParamsSchema.parse(request.params);
    //   const result = await this.gameService.getHistory(request.userId, params);
    //   reply.status(200).send(result);
  };
}
