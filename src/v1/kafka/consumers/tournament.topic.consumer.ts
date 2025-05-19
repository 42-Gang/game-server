import { KafkaTopicConsumer } from './kafka.topic.consumer.js';
import { TOPICS, TOURNAMENT_EVENTS } from '../constants.js';
import TournamentRepositoryInterface from '../../storage/database/interfaces/tournament.repository.interface.js';
import {
  createdTournamentMessageSchema,
  requestTournamentMessageSchema,
  requestTournamentMessageType,
} from '../schemas/tournament.topic.schema.js';
import { PlayerRepositoryInterface } from '../../storage/database/interfaces/player.repository.interface.js';
import { PrismaClient, Tournament, Prisma, Match, Player } from '@prisma/client';
import MatchRepositoryInterface from '../../storage/database/interfaces/match.repository.interface.js';
import { FastifyBaseLogger } from 'fastify';
import { Namespace } from 'socket.io';
import SocketCache from '../../storage/cache/socket.cache.js';
import { SOCKET_EVENTS } from '../../sockets/waiting/waiting.event.js';
import { tournamentCreatedProducer } from '../producers/tournament.producer.js';
import { GotClient } from '../../../plugins/http.client.js';
import { HttpException } from '../../common/exceptions/core.error.js';

interface tournamentCreateParams {
  tx: Prisma.TransactionClient;
  tournament: Tournament;
  level: number;
  size: number;
}

export default class TournamentTopicConsumer implements KafkaTopicConsumer {
  topic = TOPICS.TOURNAMENT;
  fromBeginning = false;

  constructor(
    private readonly tournamentRepository: TournamentRepositoryInterface,
    private readonly playerRepository: PlayerRepositoryInterface,
    private readonly matchRepository: MatchRepositoryInterface,
    private readonly prisma: PrismaClient,
    private readonly logger: FastifyBaseLogger,
    private readonly waitingNamespace: Namespace,
    private readonly socketCache: SocketCache,
    private readonly httpClient: GotClient,
    private readonly userServerUrl: string,
  ) {}

  async handle(messageValue: string): Promise<void> {
    const parsedMessage = JSON.parse(messageValue);
    this.logger.info(parsedMessage, '토너먼트 메시지 수신:');

    if (parsedMessage.eventType === TOURNAMENT_EVENTS.REQUEST) {
      const message = requestTournamentMessageSchema.parse(parsedMessage);

      this.logger.info(message, `토너먼트 요청 수신:`);
      await this.requestTournament(message);
      return;
    }
    if (parsedMessage.eventType === TOURNAMENT_EVENTS.CREATED) {
      const message = createdTournamentMessageSchema.parse(parsedMessage);

      this.logger.info(message, `토너먼트 생성 완료:`);
      const socketIds = await Promise.all(
        message.players.map((playerId) => {
          return this.socketCache.getSocketId({
            namespace: 'waiting',
            userId: playerId,
          });
        }),
      );

      const players = await this.playerRepository.findManyByTournamentId(message.tournamentId);
      if (players.length === 0) {
        throw new Error('플레이어 정보를 가져오는 데 실패했습니다.');
      }
      const playerIds = players.map((player) => player.userId);
      this.logger.info(playerIds, '플레이어 ID:');

      const users = await Promise.all(
        playerIds.map(async (userid) => {
          const user = await this.httpClient.requestJson<{
            data: {
              id: number;
              nickname: string;
              avatarUrl: string;
            };
            message: string;
          }>({
            url: `http://${this.userServerUrl}/api/v1/users/${userid}`,
            method: 'GET',
            headers: {
              'x-internal': 'true',
              'x-authenticated': 'true',
              'x-user-id': '10',
            },
          });
          if (user.statusCode !== 200) {
            throw new HttpException(user.statusCode, user.body.message);
          }
          this.logger.info(user, '유저 정보:');
          return user.body.data;
        }),
      );
      this.logger.info(users, '유저 정보:');

      for (const socketId of socketIds) {
        if (socketId) {
          this.waitingNamespace.to(socketId).emit(SOCKET_EVENTS.TOURNAMENT.CREATED, {
            tournamentId: message.tournamentId,
            mode: message.mode,
            size: message.size,
            users,
          });
        }
      }
      return;
    }
  }

  private async requestTournament(message: requestTournamentMessageType) {
    const tournament = await this.createTournamentInDatabase(message);
    // TODO: Redis에 토너먼트 방 정보 저장 및 초기화

    tournamentCreatedProducer({
      mode: message.mode,
      size: message.size,
      players: message.players,
      tournamentId: tournament.id,
      timestamp: new Date().toISOString(),
    });
  }

  private async createTournamentInDatabase(message: {
    mode: 'AUTO' | 'CUSTOM';
    players: number[];
    size: 2 | 4 | 8 | 16;
    timestamp: string;
  }): Promise<Tournament> {
    const tournament = await this.prisma.$transaction(async (tx) => {
      const tournament = await this.createTournament(message, tx);
      const players = await this.createPlayers(message, tournament, tx);

      await this.createTournamentMatches({
        tournament,
        size: message.size,
        tx,
        level: 2,
      });

      await this.assignPlayersToMatches(tournament, tx, players);
      return tournament;
    });
    this.logger.info(message, `토너먼트 생성 완료:`);

    return tournament;
  }

  private async assignPlayersToMatches(
    tournament: Tournament,
    tx: Prisma.TransactionClient,
    players: Player[],
  ) {
    const leafNodes = await this.matchRepository.findManyByTournamentIdAndRound(
      tournament.id,
      tournament.size,
      tx,
    );
    for (let i = 0; i < players.length; i += 2) {
      await this.matchRepository.update(
        leafNodes[i / 2].id,
        {
          player1: players[i].userId,
          player2: players[i + 1].userId,
        },
        tx,
      );
    }
  }

  private async createPlayers(
    message: requestTournamentMessageType,
    tournament: Tournament,
    tx: Prisma.TransactionClient,
  ) {
    return Promise.all(
      message.players.map((userId) =>
        this.playerRepository.create(
          {
            tournament: {
              connect: {
                id: tournament.id,
              },
            },
            userId: userId,
          },
          tx,
        ),
      ),
    );
  }

  private async createTournament(
    message: requestTournamentMessageType,
    tx: Prisma.TransactionClient,
  ) {
    return this.tournamentRepository.create(
      {
        winner: null,
        mode: message.mode,
        size: message.size,
      },
      tx,
    );
  }

  private async createTournamentMatches({
    tournament,
    size,
    tx,
    level,
  }: tournamentCreateParams): Promise<Match | null> {
    if (size < level) {
      return null;
    }

    const tournamentId = tournament.id;

    const match = await this.matchRepository.create(
      {
        tournament: {
          connect: {
            id: tournamentId,
          },
        },
        round: level,
      },
      tx,
    );

    const previousMatches = [
      await this.createTournamentMatches({
        tournament,
        size,
        tx,
        level: level * 2,
      }),
      await this.createTournamentMatches({
        tournament,
        size,
        tx,
        level: level * 2,
      }),
    ];

    if (previousMatches[0] !== null && previousMatches[1] !== null) {
      await this.matchRepository.update(
        match.id,
        {
          previousMatches: {
            connect: [{ id: previousMatches[0].id }, { id: previousMatches[1].id }],
          },
        },
        tx,
      );
    }

    return match;
  }
}
