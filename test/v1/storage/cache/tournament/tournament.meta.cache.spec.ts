import { beforeEach, expect, it } from 'vitest';
import { redis } from '../../../../../src/plugins/redis.js';
import TournamentMetaCache, {
  tournamentMetaType,
  tournamentStateSchema,
} from '../../../../../src/v1/storage/cache/tournament/tournament.meta.cache.js';

let cache: TournamentMetaCache;
const tournamentId = 777;
const baseKey = `tournament:${tournamentId}`;

beforeEach(async () => {
  // 각 테스트 전에 Redis를 초기화
  await redis.flushdb();
  cache = new TournamentMetaCache(redis);
});

it('should initialize meta hash correctly', async () => {
  const metaData: tournamentMetaType = { mode: 'AUTO', size: 8 };
  await cache.createTournamentMeta(tournamentId, metaData);

  // meta hash가 저장되었는지 확인
  const metaKey = `${baseKey}:meta`;
  const raw = await redis.hgetall(metaKey);
  // Redis에서 문자열로 저장되므로, 파싱해서 비교
  expect(raw.mode).toBe(metaData.mode);
  expect(Number(raw.size)).toBe(metaData.size);
});

it('should set state to IN_PROGRESS', async () => {
  const metaData: tournamentMetaType = { mode: 'CUSTOM', size: 16 };
  await cache.createTournamentMeta(tournamentId, metaData);

  const stateKey = `${baseKey}:state`;
  const state = await redis.get(stateKey);
  expect(state).toBe(tournamentStateSchema.enum.IN_PROGRESS);
});

it('should set currentRound to size', async () => {
  const metaData: tournamentMetaType = { mode: 'AUTO', size: 4 };
  await cache.createTournamentMeta(tournamentId, metaData);

  const roundKey = `${baseKey}:currentRound`;
  const roundValue = await redis.get(roundKey);
  expect(Number(roundValue)).toBe(metaData.size);
});

it('should apply TTL to all related keys', async () => {
  const metaData: tournamentMetaType = { mode: 'CUSTOM', size: 2 };
  await cache.createTournamentMeta(tournamentId, metaData);

  // 키 패턴에 맞는 키들 조회
  const keys = await redis.keys(`${baseKey}:*`);
  // 각 키의 TTL이 0보다 큰지 확인
  for (const key of keys) {
    const ttl = await redis.ttl(key);
    console.log(`Key: ${key}, TTL: ${ttl}`);
    expect(ttl).toBeGreaterThan(0);
  }
});

it('should overwrite existing meta with new values', async () => {
  const firstMeta: tournamentMetaType = { mode: 'AUTO', size: 10 };
  await cache.createTournamentMeta(tournamentId, firstMeta);

  // 덮어쓰기용 두 번째 메타
  const secondMeta: tournamentMetaType = { mode: 'CUSTOM', size: 20 };
  await cache.createTournamentMeta(tournamentId, secondMeta);

  const metaKey = `${baseKey}:meta`;
  const raw = await redis.hgetall(metaKey);
  expect(raw.mode).toBe(secondMeta.mode);
  expect(Number(raw.size)).toBe(secondMeta.size);

  const roundKey = `${baseKey}:currentRound`;
  const roundValue = await redis.get(roundKey);
  expect(Number(roundValue)).toBe(secondMeta.size);

  const stateKey = `${baseKey}:state`;
  const state = await redis.get(stateKey);
  expect(state).toBe(tournamentStateSchema.enum.IN_PROGRESS);
});
