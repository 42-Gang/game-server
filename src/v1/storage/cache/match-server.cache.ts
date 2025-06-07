import { Redis } from 'ioredis';

export default class MatchServerCache {
  constructor(private readonly redisClient: Redis) {}

  // TODO: 매치서버 리스트에서 최적의 매치서버를 선택하는 로직을 구현해야 합니다.
}
