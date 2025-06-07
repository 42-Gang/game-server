import { KafkaTopicConsumer } from './kafka.topic.consumer.js';
import { MATCH_EVENTS, TOPICS } from '../constants.js';
import MatchTopicService from './match.topic.service.js';

export default class MatchTopicConsumer implements KafkaTopicConsumer {
  topic: string = TOPICS.MATCH;
  fromBeginning: boolean = false;

  constructor(private readonly matchTopicService: MatchTopicService) {}

  async handle(messageValue: string): Promise<void> {
    const parsedMessage = JSON.parse(messageValue);

    if (parsedMessage.eventType === MATCH_EVENTS.CREATED) {
      await this.matchTopicService.handleMatchCreated(parsedMessage);
    }
    if (parsedMessage.eventType === MATCH_EVENTS.RESULT) {
      await this.matchTopicService.handleMatchResult(parsedMessage);
    }
  }
}
