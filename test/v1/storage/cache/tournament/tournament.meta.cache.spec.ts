import { beforeEach, describe, it, expect } from 'vitest';
import { redis } from '../../../../../src/plugins/redis.js';
import TournamentMetaCache, {
  tournamentMetaType,
  tournamentStateSchema,
} from '../../../../../src/v1/storage/cache/tournament/tournament.meta.cache.js';

let cache: TournamentMetaCache;
const tournamentId = 777;
const baseKey = `tournament:${tournamentId}`;

beforeEach(async () => {
  await redis.flushdb();
  cache = new TournamentMetaCache(redis);
});

describe('Error cases before initialization', () => {
  it('getCurrentRound should throw when current_round missing', async () => {
    await expect(cache.getCurrentRound(tournamentId)).rejects.toThrow(
      `Current round not found for tournament ${tournamentId}`,
    );
  });

  it('isFinished should throw when state missing', async () => {
    await expect(cache.isFinished(tournamentId)).rejects.toThrow(
      `Tournament state not found for tournament ${tournamentId}`,
    );
  });

  it('getTournamentInfo should throw when meta missing', async () => {
    await expect(cache.getTournamentInfo(tournamentId)).rejects.toThrow(
      `Tournament meta not found for tournament ${tournamentId}`,
    );
  });
});

describe('createTournamentMeta', () => {
  it('initializes meta, state, and currentRound correctly', async () => {
    const metaData: tournamentMetaType = { mode: 'AUTO', size: 8 };
    await cache.createTournamentMeta(tournamentId, metaData);

    const rawMeta = await redis.hgetall(`${baseKey}:meta`);
    expect(rawMeta.mode).toBe(metaData.mode);
    expect(Number(rawMeta.size)).toBe(metaData.size);

    const state = await redis.get(`${baseKey}:state`);
    expect(state).toBe(tournamentStateSchema.enum.IN_PROGRESS);

    const round = await redis.get(`${baseKey}:currentRound`);
    expect(Number(round)).toBe(metaData.size);
  });

  it('applies TTL to all related keys', async () => {
    const metaData: tournamentMetaType = { mode: 'CUSTOM', size: 4 };
    await cache.createTournamentMeta(tournamentId, metaData);

    const keys = await redis.keys(`${baseKey}:*`);
    for (const key of keys) {
      expect(await redis.ttl(key)).toBeGreaterThan(0);
    }
  });
});

describe('moveToNextRound behavior', () => {
  it('halves currentRound when >2 and marks FINISHED', async () => {
    const metaData: tournamentMetaType = { mode: 'AUTO', size: 8 };
    await cache.createTournamentMeta(tournamentId, metaData);

    await cache.moveToNextRound(tournamentId);

    const round = await redis.get(`${baseKey}:currentRound`);
    expect(Number(round)).toBe(4);

    const state = await redis.get(`${baseKey}:state`);
    expect(state).toBe(tournamentStateSchema.enum.IN_PROGRESS);
  });

  it('leaves currentRound unchanged when nextRound <=1 but marks FINISHED', async () => {
    const metaData: tournamentMetaType = { mode: 'CUSTOM', size: 2 };
    await cache.createTournamentMeta(tournamentId, metaData);

    await cache.moveToNextRound(tournamentId);

    const round = await redis.get(`${baseKey}:currentRound`);
    expect(Number(round)).toBe(metaData.size);

    const state = await redis.get(`${baseKey}:state`);
    expect(state).toBe(tournamentStateSchema.enum.FINISHED);
  });

  it('refreshes TTL on keys after moving rounds', async () => {
    const metaData: tournamentMetaType = { mode: 'AUTO', size: 16 };
    await cache.createTournamentMeta(tournamentId, metaData);

    // expire all keys
    const keys = await redis.keys(`${baseKey}:*`);
    for (const key of keys) {
      await redis.persist(key);
    }

    await cache.moveToNextRound(tournamentId);

    const newKeys = await redis.keys(`${baseKey}:*`);
    for (const key of newKeys) {
      expect(await redis.ttl(key)).toBeGreaterThan(0);
    }
  });
});

describe('Public getters and state checks', () => {
  it('getTournamentInfo returns full info structure', async () => {
    const metaData: tournamentMetaType = { mode: 'AUTO', size: 8 };
    await cache.createTournamentMeta(tournamentId, metaData);

    const info = await cache.getTournamentInfo(tournamentId);
    expect(info).toEqual({
      meta: metaData,
      currentRound: metaData.size,
      state: tournamentStateSchema.enum.IN_PROGRESS,
    });
  });

  it('getCurrentRound returns the current round', async () => {
    const metaData: tournamentMetaType = { mode: 'AUTO', size: 10 };
    await cache.createTournamentMeta(tournamentId, metaData);
    expect(await cache.getCurrentRound(tournamentId)).toBe(metaData.size);
  });

  it('isFinished returns correct boolean', async () => {
    const metaData: tournamentMetaType = { mode: 'AUTO', size: 12 };
    await cache.createTournamentMeta(tournamentId, metaData);
    expect(await cache.isFinished(tournamentId)).toBe(false);

    // manually mark as finished
    await redis.set(`${baseKey}:state`, tournamentStateSchema.enum.FINISHED);
    expect(await cache.isFinished(tournamentId)).toBe(true);
  });
});
