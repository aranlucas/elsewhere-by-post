export const copyBoard = (board) => board.map((tile) => ({ ...tile }));

export const definition = (level, id) =>
  level.cards.find((card) => card.id === id);

export const portsFor = (level, tile) =>
  definition(level, tile.id).ports.map((port) => (port + tile.rotation) % 4);

export const equalBoards = (a, b) =>
  a.length === b.length &&
  a.every((tile, i) => tile.id === b[i].id && tile.rotation === b[i].rotation);

export function validBoard(level, board) {
  if (!Array.isArray(board) || board.length !== level.cards.length)
    return false;
  const ids = new Set();

  return board.every((tile, index) => {
    if (
      !tile ||
      // eslint-disable-next-line anti-slop/no-runtime-typeof -- Validate untrusted saved/imported data at this native-JavaScript boundary before domain use.
      typeof tile.id !== "string" ||
      !Number.isInteger(tile.rotation) ||
      tile.rotation < 0 ||
      tile.rotation > 3 ||
      ids.has(tile.id)
    )
      return false;
    ids.add(tile.id);
    const card = definition(level, tile.id);

    if (!card) return false;

    if (
      card.locked &&
      (level.initial[index].id !== tile.id ||
        tile.rotation !== level.initial[index].rotation)
    )
      return false;

    return true;
  });
}

export function changeBoard(level, board, action) {
  if (!validBoard(level, board)) throw new Error("Invalid board");
  const next = copyBoard(board);
  const at = action.at;

  if (
    !Number.isInteger(at) ||
    at < 0 ||
    at >= next.length ||
    definition(level, next[at].id).locked
  )
    return next;

  if (action.type === "rotate")
    next[at].rotation =
      (next[at].rotation + (action.counterclockwise ? 3 : 1)) % 4;

  if (
    action.type === "swap" &&
    Number.isInteger(action.to) &&
    action.to >= 0 &&
    action.to < next.length &&
    !definition(level, next[action.to].id).locked
  )
    [next[at], next[action.to]] = [next[action.to], next[at]];

  return next;
}

export function network(level, board) {
  const graph = board.map(() => []);

  const echoPairs = [
    ...new Set(level.cards.map((card) => card.echo).filter(Boolean)),
  ];

  board.forEach((tile, i) => {
    const row = Math.floor(i / level.columns),
      col = i % level.columns;

    for (const dir of portsFor(level, tile)) {
      const nr = row + [-1, 0, 1, 0][dir],
        nc = col + [0, 1, 0, -1][dir];

      if (
        nc < 0 ||
        nc >= level.columns ||
        nr < 0 ||
        nr >= board.length / level.columns
      )
        continue;
      const j = nr * level.columns + nc;

      if (portsFor(level, board[j]).includes((dir + 2) % 4))
        graph[i].push({ to: j, type: "road", direction: dir });
    }

    const echo = definition(level, tile.id).echo;

    if (echo)
      board.forEach((other, j) => {
        if (
          j !== i &&
          definition(level, other.id).echo === echo &&
          other.rotation === tile.rotation
        )
          graph[i].push({
            to: j,
            type: "echo",
            echo,
            bit: 1 << echoPairs.indexOf(echo),
          });
      });
  });

  return { graph, echoPairs };
}

// Breadth-first search includes collected stamps and consumed echo pairs in its
// state. Graph reachability alone cannot prove that one legal journey exists.
export function traceJourney(level, board) {
  if (!validBoard(level, board)) throw new Error("Invalid board");
  const { graph, echoPairs } = network(level, board);

  const stampIds = level.cards
    .filter((card) => card.stamp)
    .map((card) => card.id);

  const stampBit = (i) => {
    const n = stampIds.indexOf(board[i].id);

    return n < 0 ? 0 : 1 << n;
  };

  const allStamps = (1 << stampIds.length) - 1;

  const requiredEchoMask = level.requiredEchoes.reduce(
    (mask, echo) => mask | (1 << echoPairs.indexOf(echo)),
    0,
  );

  const start = board.findIndex((tile) => tile.id === level.start),
    goal = board.findIndex((tile) => tile.id === level.goal);

  const queue = [
    { at: start, stamps: stampBit(start), echoes: 0, parent: -1, via: null },
  ];

  const seen = new Set([`${start}:${queue[0].stamps}:0`]);

  let best = 0,
    success = -1;

  const score = (state) =>
    popcount(state.stamps) * 4 +
    popcount(state.echoes) * 2 +
    (state.at === goal ? 1 : 0);

  for (let head = 0; head < queue.length; head++) {
    const state = queue[head];

    if (score(state) > score(queue[best])) best = head;

    if (
      state.at === goal &&
      state.stamps === allStamps &&
      (state.echoes & requiredEchoMask) === requiredEchoMask
    ) {
      success = head;
      break;
    }

    // Delivery is a terminus. A courier cannot pass through it to collect stamps.
    if (state.at === goal) continue;

    for (const edge of graph[state.at]) {
      if (edge.type === "echo" && state.echoes & edge.bit) continue;

      const stamps = state.stamps | stampBit(edge.to),
        echoes = state.echoes | (edge.bit || 0);

      const key = `${edge.to}:${stamps}:${echoes}`;

      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ at: edge.to, stamps, echoes, parent: head, via: edge });
    }
  }

  const end = queue[success < 0 ? best : success];
  const steps = [];
  let cursor = success < 0 ? best : success;

  while (cursor >= 0) {
    const state = queue[cursor];
    steps.unshift({ at: state.at, via: state.via });
    cursor = state.parent;
  }

  return {
    success: success >= 0,
    steps,
    graph,
    collected: stampIds.filter((_, i) => end.stamps & (1 << i)),
    missing: stampIds.filter((_, i) => !(end.stamps & (1 << i))),
    usedEchoes: echoPairs.filter((_, i) => end.echoes & (1 << i)),
    missingEchoes: level.requiredEchoes.filter(
      (echo) => !(end.echoes & (1 << echoPairs.indexOf(echo))),
    ),
    reachedGoal: end.at === goal,
    exploredStates: seen.size,
  };
}

function popcount(n) {
  let count = 0;

  while (n) {
    count += n & 1;
    n >>>= 1;
  }

  return count;
}

export function nextHint(level, board) {
  if (traceJourney(level, board).success) return null;

  for (let i = 0; i < board.length; i++) {
    if (definition(level, board[i].id).locked) continue;

    if (board[i].id !== level.solution[i].id)
      return {
        type: "swap",
        at: i,
        to: board.findIndex((tile) => tile.id === level.solution[i].id),
      };

    if (board[i].rotation !== level.solution[i].rotation)
      return { type: "rotate", at: i };
  }

  return null;
}

export function remixBoard(level, seed) {
  const board = copyBoard(level.solution);
  let state = seed >>> 0;

  const random = (n) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state % n;
  };

  const mutable = board
    .map((tile, i) => (definition(level, tile.id).locked ? -1 : i))
    .filter((i) => i >= 0);

  for (let i = mutable.length - 1; i > 0; i--) {
    const a = mutable[i],
      b = mutable[random(i + 1)];

    [board[a], board[b]] = [board[b], board[a]];
  }

  for (const i of mutable) board[i].rotation = random(4);

  // Avoid accidentally serving an already solved shuffle.
  if (traceJourney(level, board).success) return copyBoard(level.initial);

  return board;
}
