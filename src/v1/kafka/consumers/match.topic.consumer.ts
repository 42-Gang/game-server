import { KafkaTopicConsumer } from './kafka.topic.consumer.js';
import { MATCH_EVENTS, TOPICS } from '../constants.js';
import MatchTopicService from './match.topic.service.js';
import { FastifyBaseLogger } from 'fastify';

export default class MatchTopicConsumer implements KafkaTopicConsumer {
  topic: string = TOPICS.MATCH;
  fromBeginning: boolean = false;

  constructor(
    private readonly matchTopicService: MatchTopicService,
    private readonly logger: FastifyBaseLogger,
  ) {}

  async handle(messageValue: string): Promise<void> {
    const parsedMessage = this.parseMessage(messageValue);
    this.logger.info(parsedMessage, '토너먼트 메시지 수신:');

    if (parsedMessage.eventType === MATCH_EVENTS.CREATED) {
      await this.matchTopicService.handleMatchCreated(parsedMessage);
    }
    if (parsedMessage.eventType === MATCH_EVENTS.RESULT) {
      await this.matchTopicService.handleMatchResult(parsedMessage);
    }
  }

  private parseMessage(messageValue: string) {
    try {
      return JSON.parse(messageValue);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse message: ${msg}`);
    }
  }
}
