import { KafkaTopicConsumer } from './kafka.topic.consumer.js';
import { MATCH_EVENTS, TOPICS } from '../constants.js';

export default class MatchTopicConsumer implements KafkaTopicConsumer {
  topic: string = TOPICS.MATCH;
  fromBeginning: boolean = false;

  async handle(messageValue: string): Promise<void> {
    const parsedMessage = JSON.parse(messageValue);

    if (parsedMessage.eventType === MATCH_EVENTS.CREATED) {
      // TODO: 매치 생성 완료 토픽 처리
    }
    if (parsedMessage.eventType === MATCH_EVENTS.RESULT) {
      // TODO: 매치 게임 결과 토픽 처리
    }
  }
}
