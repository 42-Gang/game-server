import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import TournamentPlayerCache from '../../../../../src/v1/storage/cache/tournament/tournament.player.cache.js';

let cache: TournamentPlayerCache;
const tournamentId = 123;
let redis: Redis;

beforeEach(async () => {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
  });
  await redis.flushdb();
  cache = new TournamentPlayerCache(redis);
});

describe('registerPlayers', () => {
  it('should add multiple players to the tournament set', async () => {
    console.log(await redis.smembers(`tournament:${tournamentId}:players`));
    await cache.registerPlayers(tournamentId, [10, 20, 30]);
    const members = await redis.smembers(`tournament:${tournamentId}:players`);
    console.log(`members: ${members}`);
    const players = members.map(Number).sort((a, b) => a - b);
    expect(players).toEqual([10, 20, 30]);
  });

  it('should set TTL on the players set', async () => {
    await cache.registerPlayers(tournamentId, [1, 2, 3]);
    // 키가 생성된 직후라 TTL은 TOURNAMENT_TTL (예: 1800) 이하일 것
    const ttl = await redis.ttl(`tournament:${tournamentId}:players`);
    expect(ttl).toBeGreaterThan(0);
  });
});

describe('setPlayerReady', () => {
  it('should add an active player to the ready set', async () => {
    // 먼저 선수 등록
    await cache.registerPlayers(tournamentId, [5, 6]);
    await cache.setPlayerReady(tournamentId, 6);

    const readyMembers = await redis.smembers(`tournament:${tournamentId}:players:ready`);
    expect(readyMembers.map(Number)).toEqual([6]);
  });

  it('should throw if the player is eliminated (not active)', async () => {
    // 선수 등록 후 곧바로 제거하여 eliminated 처리
    await cache.registerPlayers(tournamentId, [7]);
    // eliminatePlayer 메서드를 직접 사용하여 7번 탈락
    await cache.eliminatePlayer(tournamentId, 7);
    await expect(cache.setPlayerReady(tournamentId, 7)).rejects.toThrow(
      `Player 7 is not an active player in tournament ${tournamentId}`,
    );
  });

  it('should set TTL on the ready set', async () => {
    await cache.registerPlayers(tournamentId, [8]);
    await cache.setPlayerReady(tournamentId, 8);
    const ttl = await redis.ttl(`tournament:${tournamentId}:players:ready`);
    expect(ttl).toBeGreaterThan(0);
  });
});

describe('areAllPlayersReady', () => {
  it('should return true when all active players are in ready set', async () => {
    await cache.registerPlayers(tournamentId, [1, 2, 3]);
    // player 2, 3 준비
    await cache.setPlayerReady(tournamentId, 2);
    await cache.setPlayerReady(tournamentId, 3);
    // player 1은 아직 ready 상태가 아니므로 false
    let allReady = await cache.areAllPlayersReady(tournamentId);
    expect(allReady).toBe(false);

    // player 1 준비
    await cache.setPlayerReady(tournamentId, 1);
    allReady = await cache.areAllPlayersReady(tournamentId);
    expect(allReady).toBe(true);
  });

  it('should ignore eliminated players when checking readiness', async () => {
    await cache.registerPlayers(tournamentId, [4, 5, 6]);
    // player 6 탈락
    await cache.eliminatePlayer(tournamentId, 6);
    // player 4, 5만 ready
    await cache.setPlayerReady(tournamentId, 4);
    await cache.setPlayerReady(tournamentId, 5);

    const allReady = await cache.areAllPlayersReady(tournamentId);
    expect(allReady).toBe(true);
  });

  it('should return false if some active players are not ready', async () => {
    await cache.registerPlayers(tournamentId, [7, 8, 9]);
    // only player 7 준비
    await cache.setPlayerReady(tournamentId, 7);

    const allReady = await cache.areAllPlayersReady(tournamentId);
    expect(allReady).toBe(false);
  });

  it('should set TTL on the ready set', async () => {
    await cache.registerPlayers(tournamentId, [10]);
    await cache.setPlayerReady(tournamentId, 10);
    const ttl = await redis.ttl(`tournament:${tournamentId}:players:ready`);
    expect(ttl).toBeGreaterThan(0);
  });
});

describe('movePlayersToPlaying', () => {
  it('should move all ready players to playing set', async () => {
    await cache.registerPlayers(tournamentId, [11, 12, 13]);
    await cache.setPlayerReady(tournamentId, 11);
    await cache.setPlayerReady(tournamentId, 12);
    await cache.setPlayerReady(tournamentId, 13);

    await cache.movePlayersToPlaying(tournamentId);

    const readyMembers = await redis.smembers(`tournament:${tournamentId}:players:ready`);
    const playingMembers = await redis.smembers(`tournament:${tournamentId}:players:playing`);
    expect(readyMembers).toEqual([]); // 모두 제거
    const playing = playingMembers.map(Number).sort((a, b) => a - b);
    expect(playing).toEqual([11, 12, 13]);
  });

  it('should set TTL on ready and playing sets', async () => {
    await cache.registerPlayers(tournamentId, [14, 15]);
    await cache.setPlayerReady(tournamentId, 14);
    await cache.setPlayerReady(tournamentId, 15);
    await cache.movePlayersToPlaying(tournamentId);

    const isExistsReadyKey = await redis.exists(`tournament:${tournamentId}:players:ready`);
    const ttlPlaying = await redis.ttl(`tournament:${tournamentId}:players:playing`);
    expect(isExistsReadyKey).toBe(0);
    expect(ttlPlaying).toBeGreaterThan(0);
  });

  it('should not move players if no ready players', async () => {
    await cache.registerPlayers(tournamentId, [16, 17]);
    // ready 상태로 설정하지 않음
    await expect(cache.movePlayersToPlaying(tournamentId)).rejects.toThrow(Error);
  });
});

describe('eliminatePlayer', () => {
  it('should  add to eliminated set', async () => {
    await cache.registerPlayers(tournamentId, [21, 22, 23]);
    // player 22 탈락
    await cache.eliminatePlayer(tournamentId, 22);

    const eliminated = await redis.smembers(`tournament:${tournamentId}:players:eliminated`);
    expect(eliminated.map(Number)).toEqual([22]);
  });

  it('should set TTL on players and eliminated sets', async () => {
    await cache.registerPlayers(tournamentId, [24]);
    await cache.eliminatePlayer(tournamentId, 24);

    const ttlPlayers = await redis.ttl(`tournament:${tournamentId}:players`);
    const ttlElim = await redis.ttl(`tournament:${tournamentId}:players:eliminated`);
    expect(ttlPlayers).toBeGreaterThan(0);
    expect(ttlElim).toBeGreaterThan(0);
  });
});
