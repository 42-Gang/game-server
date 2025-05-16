import { KafkaTopicConsumer } from './kafka.topic.consumer.js';
import { TOPICS, TOURNAMENT_EVENTS } from '../constants.js';

export default class TournamentTopicConsumer implements KafkaTopicConsumer {
  topic = TOPICS.TOURNAMENT;
  fromBeginning = false;

  async handle(messageValue: string): Promise<void> {
    const parsedMessage = JSON.parse(messageValue);

    if (parsedMessage.eventType == TOURNAMENT_EVENTS.REQUEST) {
      /** TODO: Database에 토너먼트 테이블 생성
       * 1. 토너먼트를 생성.
       * 2. 참가자를 등록.
       * 3. 매치 정보들 생성.
       * 4. 매치에 사용자 배치.
       * 5. redis 에 토너먼트 방 정보 저장.
       */

      return;
    }
    if (parsedMessage.eventType == TOURNAMENT_EVENTS.CREATED) {
      /** TODO: Redis에 토너먼트 방 정보 저장 및 초기화
       * 1. 접속해야할 토너먼트 ID를 사용자들에게 전달.
       */
      return;
    }
  }
}
