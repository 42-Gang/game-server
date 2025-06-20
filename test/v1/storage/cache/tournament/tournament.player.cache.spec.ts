import { beforeEach, describe, expect, it } from 'vitest';
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
    await cache.registerPlayers(tournamentId, [10, 20, 30]);
    const members = await redis.smembers(`tournament:${tournamentId}:players`);
    const players = members.map(Number).sort((a, b) => a - b);
    expect(players).toEqual([10, 20, 30]);
  });

  it('should set TTL on the players set', async () => {
    await cache.registerPlayers(tournamentId, [1, 2, 3]);
    const ttl = await redis.ttl(`tournament:${tournamentId}:players`);
    expect(ttl).toBeGreaterThan(0);
  });
});

describe('setPlayerReady', () => {
  it('should add an active player to the ready set', async () => {
    await cache.registerPlayers(tournamentId, [5, 6]);
    await cache.setPlayerReady(tournamentId, 6);
    const readyMembers = await redis.smembers(`tournament:${tournamentId}:players:ready`);
    expect(readyMembers.map(Number)).toEqual([6]);
  });

  it('should throw if the player is eliminated (not active)', async () => {
    await cache.registerPlayers(tournamentId, [7]);
    await cache.eliminatePlayer(tournamentId, 7);
    await expect(cache.setPlayerReady(tournamentId, 7)).rejects.toThrow(
      `Player 7 is not an active player in tournament ${tournamentId}`
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
    await cache.setPlayerReady(tournamentId, 2);
    await cache.setPlayerReady(tournamentId, 3);
    let allReady = await cache.areAllPlayersReady(tournamentId);
    expect(allReady).toBe(false);
    await cache.setPlayerReady(tournamentId, 1);
    allReady = await cache.areAllPlayersReady(tournamentId);
    expect(allReady).toBe(true);
  });

  it('should ignore eliminated players when checking readiness', async () => {
    await cache.registerPlayers(tournamentId, [4, 5, 6]);
    await cache.eliminatePlayer(tournamentId, 6);
    await cache.setPlayerReady(tournamentId, 4);
    await cache.setPlayerReady(tournamentId, 5);
    const allReady = await cache.areAllPlayersReady(tournamentId);
    expect(allReady).toBe(true);
  });

  it('should return false if some active players are not ready', async () => {
    await cache.registerPlayers(tournamentId, [7, 8, 9]);
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
    expect(readyMembers).toEqual([]);
    const playing = playingMembers.map(Number).sort((a, b) => a - b);
    expect(playing).toEqual([11, 12, 13]);
  });

  it('should set TTL on ready and playing sets', async () => {
    await cache.registerPlayers(tournamentId, [14, 15]);
    await cache.setPlayerReady(tournamentId, 14);
    await cache.setPlayerReady(tournamentId, 15);
    await cache.movePlayersToPlaying(tournamentId);
    const existsReady = await redis.exists(`tournament:${tournamentId}:players:ready`);
    const ttlPlaying = await redis.ttl(`tournament:${tournamentId}:players:playing`);
    expect(existsReady).toBe(0);
    expect(ttlPlaying).toBeGreaterThan(0);
  });

  it('should not move players if no ready players', async () => {
    await cache.registerPlayers(tournamentId, [16, 17]);
    await expect(cache.movePlayersToPlaying(tournamentId)).rejects.toThrow(Error);
  });
});

// New tests for full coverage

describe('isUserParticipant', () => {
  it('returns true for registered player', async () => {
    await cache.registerPlayers(tournamentId, [21]);
    expect(await cache.isUserParticipant(tournamentId, 21)).toBe(true);
  });

  it('returns false for non-registered player', async () => {
    expect(await cache.isUserParticipant(tournamentId, 999)).toBe(false);
  });
});

describe('movePlayerToEliminated', () => {
  it('moves a playing player to eliminated', async () => {
    await cache.registerPlayers(tournamentId, [30]);
    await cache.setPlayerReady(tournamentId, 30);
    await cache.movePlayersToPlaying(tournamentId);
    await cache.movePlayerToEliminated(tournamentId, 30);
    const eliminated = await redis.smembers(`tournament:${tournamentId}:players:eliminated`);
    expect(eliminated.map(Number)).toEqual([30]);
  });

  it('throws if player not active', async () => {
    await cache.registerPlayers(tournamentId, [31]);
    await cache.eliminatePlayer(tournamentId, 31);
    await expect(cache.movePlayerToEliminated(tournamentId, 31)).rejects.toThrow(
      `Player 31 is not an active player in tournament ${tournamentId}`
    );
  });

  it('throws if player not playing', async () => {
    await cache.registerPlayers(tournamentId, [32]);
    await expect(cache.movePlayerToEliminated(tournamentId, 32)).rejects.toThrow(
      `Player 32 is not currently playing in tournament ${tournamentId}`
    );
  });

  it('sets TTL on players and eliminated sets', async () => {
    await cache.registerPlayers(tournamentId, [33]);
    await cache.setPlayerReady(tournamentId, 33);
    await cache.movePlayersToPlaying(tournamentId);
    await cache.movePlayerToEliminated(tournamentId, 33);
    const ttlPlayers = await redis.ttl(`tournament:${tournamentId}:players`);
    const ttlElim = await redis.ttl(`tournament:${tournamentId}:players:eliminated`);
    expect(ttlPlayers).toBeGreaterThan(0);
    expect(ttlElim).toBeGreaterThan(0);
  });
});

describe('getPlayerState', () => {
  it('returns NOTHING if no state', async () => {
    expect(await cache.getPlayerState(tournamentId, 40)).toBe('NOTHING');
  });

  it('returns READY if in ready set', async () => {
    await cache.registerPlayers(tournamentId, [41]);
    await cache.setPlayerReady(tournamentId, 41);
    expect(await cache.getPlayerState(tournamentId, 41)).toBe('READY');
  });

  it('returns PLAYING if in playing set', async () => {
    await cache.registerPlayers(tournamentId, [42]);
    await cache.setPlayerReady(tournamentId, 42);
    await cache.movePlayersToPlaying(tournamentId);
    expect(await cache.getPlayerState(tournamentId, 42)).toBe('PLAYING');
  });

  it('returns ELIMINATED if in eliminated set', async () => {
    await cache.registerPlayers(tournamentId, [43]);
    await cache.setPlayerReady(tournamentId, 43);
    await cache.movePlayersToPlaying(tournamentId);
    await cache.movePlayerToEliminated(tournamentId, 43);
    expect(await cache.getPlayerState(tournamentId, 43)).toBe('ELIMINATED');
  });
});

describe('getAllPlayerIds', () => {
  it('returns all registered player ids', async () => {
    await cache.registerPlayers(tournamentId, [50, 51]);
    const allIds = await cache.getAllPlayerIds(tournamentId);
    expect(allIds.sort((a, b) => a - b)).toEqual([50, 51]);
  });
});
