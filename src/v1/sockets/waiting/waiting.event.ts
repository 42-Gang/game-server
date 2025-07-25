export const WAITING_SOCKET_EVENTS = {
  AUTO: {
    JOIN: 'auto-join',
    LEAVE: 'auto-leave',
  },

  LEAVE_SUCCESS: 'leave-success',

  CUSTOM: {
    CREATE: 'custom-create',
    JOIN: 'custom-join',
    INVITE: 'custom-invite',
    ACCEPT: 'custom-accept',
    START: 'custom-start',
    LEAVE: 'custom-leave',
  },

  WAITING_ROOM_UPDATE: 'waiting-room-update',

  TOURNAMENT: {
    REQUEST: 'tournament-request',
    CREATED: 'tournament-created',
  },
};
