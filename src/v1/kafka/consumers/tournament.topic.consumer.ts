import { KafkaTopicConsumer } from './kafka.topic.consumer.js';
import { TOPICS, TOURNAMENT_EVENTS } from '../constants.js';

export default class TournamentTopicConsumer implements KafkaTopicConsumer {
  topic = TOPICS.TOURNAMENT;
  fromBeginning = false;

  async handle(messageValue: string): Promise<void> {
    const parsedMessage = JSON.parse(messageValue);

    if (parsedMessage.eventType == TOURNAMENT_EVENTS.REQUEST) {
      // TODO: Database에 토너먼트 테이블 생성
      return;
    }
    if (parsedMessage.eventType == TOURNAMENT_EVENTS.CREATED) {
      // TODO: Redis에 토너먼트 방 정보 저장 및 초기화
      return;
    }
  }
}
