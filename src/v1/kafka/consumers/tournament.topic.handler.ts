import { KafkaTopicHandler } from './kafka.topic.handler.js';

export default class TournamentTopicHandler implements KafkaTopicHandler {
  topic = 'tournament';
  fromBeginning = false;

  async handle(messageValue: string): Promise<void> {
    // TODO: Database에 토너먼트 테이블 생성
    // TODO: Redis에 토너먼트 방 정보 저장 및 초기화
  }
}
