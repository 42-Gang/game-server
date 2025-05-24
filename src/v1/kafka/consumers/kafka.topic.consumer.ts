export interface KafkaTopicConsumer {
  /** 이 핸들러가 구독할 토픽 이름 */
  topic: string;
  fromBeginning: boolean;

  /** 토픽 메시지가 오면 실행될 로직 */
  handle(messageValue: string): Promise<void>;
}
