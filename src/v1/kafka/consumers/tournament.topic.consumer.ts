import { KafkaTopicConsumer } from './kafka.topic.consumer.js';
import { TOPICS, TOURNAMENT_EVENTS } from '../constants.js';
import TournamentRepositoryInterface from '../../storage/database/interfaces/tournament.repository.interface.js';
import {
  requestTournamentMessageSchema,
  requestTournamentMessageType,
} from '../schemas/tournament.topic.schema.js';
import { PlayerRepositoryInterface } from '../../storage/database/interfaces/player.repository.interface.js';
import { PrismaClient, Tournament, Prisma, Match, Player } from '@prisma/client';
import MatchRepositoryInterface from '../../storage/database/interfaces/match.repository.interface.js';

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
  ) {}

  async handle(messageValue: string): Promise<void> {
    const parsedMessage = JSON.parse(messageValue);

    if (parsedMessage.eventType == TOURNAMENT_EVENTS.REQUEST) {
      const message = requestTournamentMessageSchema.parse(parsedMessage);
      await this.requestTournament(message);

      return;
    }
    if (parsedMessage.eventType == TOURNAMENT_EVENTS.CREATED) {
      /** TODO: Redis에 토너먼트 방 정보 저장 및 초기화
       * 1. 접속해야할 토너먼트 ID를 사용자들에게 전달.
       */
      return;
    }
  }

  private async requestTournament(message: requestTournamentMessageType) {
    await this.prisma.$transaction(async (tx) => {
      const tournament = await this.createTournament(message, tx);
      const players = await this.createPlayers(message, tournament, tx);

      await this.createTournamentMatches({
        tournament,
        size: message.size,
        tx,
        level: 1,
      });

      await this.assignPlayersToMatches(tournament, tx, players);
    });
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
          player1: players[i].id,
          player2: players[i + 1].id,
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
