import type { Game, InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as K from "./constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
  readonly theta: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly obstacleClock: number;
  readonly obstacleClockRunning: boolean;
  readonly simTime: number;
  readonly muted: boolean;
  readonly menuPresses?: Readonly<Record<number, number>>;
}
export interface MenuRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export type CaromSnapshot = Omit<CaromState, "ball" | "menuPresses"> & {
  readonly version: number;
  readonly ball: (BallState & { readonly speed: number }) | null;
};
type RO = DeepReadonly<CaromState>;
type Pose = (s: RO) => CaromState;
export interface CaromDebugApi {
  readonly version: number;
  clearWorld: Pose;
  spawnBall: Pose;
  spawnObstacle(s: RO, index: number): CaromState;
  reset: Pose;
  reconcile: Pose;
  setScreen(s: RO, v: Screen): CaromState;
  setMode(s: RO, v: Mode): CaromState;
  setMenuIndex(s: RO, v: number): CaromState;
  setTitleIndex(s: RO, v: number): CaromState;
  setResumeScreen(s: RO, v: "countdown" | "playing"): CaromState;
  setScore(s: RO, p1: number, p2: number): CaromState;
  setWinner(s: RO, v: Side | null): CaromState;
  setReceiver(s: RO, v: Side): CaromState;
  setPaddleCy(s: RO, side: Side, v: number): CaromState;
  setPaddleVy(s: RO, side: Side, v: number): CaromState;
  setPaddleDriven(s: RO, side: Side, v: boolean): CaromState;
  setBallPosition(s: RO, x: number, y: number): CaromState;
  setBallVelocity(s: RO, x: number, y: number): CaromState;
  setBallSpin(s: RO, v: number): CaromState;
  setBallHeld(s: RO, v: boolean): CaromState;
  setBallHoldTimer(s: RO, v: number): CaromState;
  setBallServeSign(s: RO, v: 1 | -1): CaromState;
  drawBallServeSign: Pose;
  setAiTracking(s: RO, v: boolean): CaromState;
  setAiMovement(s: RO, v: boolean): CaromState;
  setMuted(s: RO, v: boolean): CaromState;
  setObstacleClock(s: RO, v: number): CaromState;
  setObstacleClockRunning(s: RO, v: boolean): CaromState;
  snapshot(s: RO): CaromSnapshot;
  menuItemRect(s: RO, index: number): MenuRect | null;
}
export const BACKGROUND = "#07121e";
const TAU = Math.PI * 2,
  cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const sign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
const ball = (): BallState => ({
  x: K.FIELD_CX,
  y: K.FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: K.HOLD_TIME,
  serveSign: sign(),
  trail: [],
});
function pose(index: number, t: number): ObstacleState {
  const p = K.OBSTACLE_CENTERS[index];
  if (!p) throw new RangeError(`no obstacle ${index}`);
  const sway =
    K.OBSTACLE_SWAY_AMP * Math.sin((TAU * t) / K.OBSTACLE_SWAY_PERIOD);
  return {
    index,
    cx: p.x,
    cy: p.y + (index ? -sway : sway),
    theta: K.OBSTACLE_SPIN_RATE * t,
  };
}
function cp(s: RO): CaromState {
  return {
    ...s,
    score: { ...s.score },
    paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
    ai: { ...s.ai },
    ball: s.ball
      ? { ...s.ball, trail: s.ball.trail.map((p) => ({ ...p })) }
      : null,
    obstacles: s.obstacles.map((o) => ({ ...o })),
    menuPresses: { ...(s.menuPresses ?? {}) },
  };
}
function fresh(muted = false): CaromState {
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: {
      left: { cy: K.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
      right: { cy: K.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
    },
    ai: { tracking: true, movement: true },
    receiver: "left",
    ball: ball(),
    obstacles: [pose(0, 0), pose(1, 0)],
    obstacleClock: 0,
    obstacleClockRunning: true,
    simTime: 0,
    muted,
    menuPresses: {},
  };
}
const count = (s: Screen) =>
  s === "title"
    ? 3
    : s === "howto"
      ? 1
      : s === "paused"
        ? 3
        : s === "matchover"
          ? 2
          : 0;
function rect(s: RO, i: number): MenuRect | null {
  if (i < 0 || i >= count(s.screen) || !Number.isInteger(i)) return null;
  const w = s.screen === "howto" ? 260 : 360,
    y = s.screen === "title" ? 384 : s.screen === "howto" ? 590 : 390;
  return { x: K.FIELD_CX - w / 2, y: y + i * 74, w, h: 58 };
}
function at(s: RO, x: number, y: number): number | null {
  for (let i = 0; i < count(s.screen); i++) {
    const r = rect(s, i);
    if (r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return null;
}
function title(s: RO): CaromState {
  const n = fresh(s.muted);
  return {
    ...n,
    titleIndex: s.titleIndex,
    menuIndex: s.titleIndex,
    simTime: s.simTime,
  };
}
function start(s: RO, mode: Mode): CaromState {
  const n = cp(s);
  return {
    ...n,
    screen: "countdown",
    mode,
    menuIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    ball: ball(),
    paddles: {
      left: { ...n.paddles.left, cy: K.FIELD_CY, vy: 0 },
      right: { ...n.paddles.right, cy: K.FIELD_CY, vy: 0 },
    },
    obstacleClock: 0,
    obstacleClockRunning: true,
    obstacles: n.obstacles.map((o) => pose(o.index, 0)),
    menuPresses: {},
  };
}
function confirm(s: RO): CaromState {
  if (s.screen === "title") {
    const n = { ...cp(s), titleIndex: s.menuIndex };
    return s.menuIndex === 0
      ? start(n, "solo")
      : s.menuIndex === 1
        ? start(n, "versus")
        : { ...n, screen: "howto", menuIndex: 0 };
  }
  if (s.screen === "howto") return title(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...cp(s), screen: s.resumeScreen }
      : s.menuIndex === 1
        ? start(s, s.mode)
        : title(s);
  if (s.screen === "matchover")
    return s.menuIndex === 0 ? start(s, s.mode) : title(s);
  return cp(s);
}

function input(s: RO, a: UpdateApi): CaromState {
  let n = cp(s);
  if (a.input.pressed("mute")) {
    a.audio.setMuted(!a.audio.muted());
  } else if (a.audio.muted() !== s.muted) a.audio.setMuted(s.muted);
  n = { ...n, muted: a.audio.muted() };
  const up = a.input.pressed("p1-up") || a.input.pressed("p2-up"),
    down = a.input.pressed("p1-down") || a.input.pressed("p2-down"),
    ok = a.input.pressed("confirm"),
    back = a.input.pressed("back"),
    pause = a.input.pressed("pause");
  if (s.screen === "playing" || s.screen === "countdown")
    return pause
      ? { ...n, resumeScreen: s.screen, screen: "paused", menuIndex: 0 }
      : n;
  if (s.screen === "paused" && (pause || back))
    return { ...n, screen: s.resumeScreen };
  if (s.screen === "howto" && (ok || back)) return title(n);
  if (s.screen === "matchover" && back) return title(n);
  const c = count(s.screen);
  let keyboard = false;
  if (c) {
    if (up) n = { ...n, menuIndex: (s.menuIndex - 1 + c) % c };
    else if (down) n = { ...n, menuIndex: (s.menuIndex + 1) % c };
    else if (ok) {
      n = confirm(n);
      keyboard = true;
    }
  }
  if (keyboard || !c) return n;
  const presses: Record<number, number> = { ...(n.menuPresses ?? {}) };
  let doConfirm = false;
  for (const p of a.input.pointerSamples()) {
    const i = at(n, p.x, p.y);
    if (i !== null) n = { ...n, menuIndex: i };
    if (p.type === "down") {
      if (i === null) delete presses[p.id];
      else presses[p.id] = i;
    } else if (p.type === "up") {
      if (i !== null && presses[p.id] === i) doConfirm = true;
      delete presses[p.id];
    }
  }
  const p = a.input.pointer();
  if (p.device !== "touch") {
    const i = at(n, p.x, p.y);
    if (i !== null) n = { ...n, menuIndex: i };
  }
  n = { ...n, menuPresses: presses };
  return doConfirm ? confirm(n) : n;
}
function move(
  p: DeepReadonly<PaddleState>,
  vy: number,
  dt: number,
): PaddleState {
  const raw = p.cy + vy * dt,
    cy = cl(raw, K.PADDLE_MIN_CY, K.PADDLE_MAX_CY);
  return { ...p, cy, vy: dt > 0 && cy !== raw ? (cy - p.cy) / dt : vy };
}
function paddles(s: RO, a: UpdateApi, dt: number): CaromState["paddles"] {
  const lv = s.paddles.left.driven
    ? s.paddles.left.drivenVy
    : (s.mode === "solo"
        ? Math.max(a.input.value("p1-down"), a.input.value("p2-down")) -
          Math.max(a.input.value("p1-up"), a.input.value("p2-up"))
        : a.input.value("p1-down") - a.input.value("p1-up")) * K.PADDLE_SPEED;
  let rv = 0;
  if (s.paddles.right.driven) rv = s.paddles.right.drivenVy;
  else if (s.mode === "versus")
    rv = (a.input.value("p2-down") - a.input.value("p2-up")) * K.PADDLE_SPEED;
  else if (s.ai.movement) {
    let target = K.AI_HOME_Y,
      dz = K.AI_HOME_DEADZONE;
    if (s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0) {
      target = s.ball.y - s.ball.vy * K.AI_REACT;
      dz = K.AI_DEADZONE;
    }
    const d = target - s.paddles.right.cy;
    rv =
      Math.abs(d) <= dz || dt <= 0
        ? 0
        : Math.sign(d) * Math.min(K.AI_SPEED, Math.abs(d) / dt);
  }
  return {
    left: move(s.paddles.left, lv, dt),
    right: move(s.paddles.right, rv, dt),
  };
}
interface Events {
  wall: boolean;
  paddle: boolean;
  obstacle: boolean;
}
function hitPaddle(
  b: BallState,
  p: DeepReadonly<PaddleState>,
  x0: number,
  x1: number,
  side: Side,
  e: Events,
): BallState {
  const y0 = p.cy - K.PADDLE_HALF,
    y1 = p.cy + K.PADDLE_HALF;
  if (
    b.x <= x0 - K.BALL_R ||
    b.x >= x1 + K.BALL_R ||
    b.y <= y0 - K.BALL_R ||
    b.y >= y1 + K.BALL_R
  )
    return b;
  const ds = [
      b.x - (x0 - K.BALL_R),
      x1 + K.BALL_R - b.x,
      b.y - (y0 - K.BALL_R),
      y1 + K.BALL_R - b.y,
    ],
    f = ds.indexOf(Math.min(...ds));
  if (f === 2) {
    e.wall = true;
    return { ...b, y: y0 - K.BALL_R, vy: b.vy > 0 ? -b.vy : b.vy };
  }
  if (f === 3) {
    e.wall = true;
    return { ...b, y: y1 + K.BALL_R, vy: b.vy < 0 ? -b.vy : b.vy };
  }
  e.paddle = true;
  const th = cl((b.y - p.cy) / K.PADDLE_HALF, -1, 1) * K.MAX_BOUNCE_ANGLE,
    sp = Math.min(Math.hypot(b.vx, b.vy) * K.SPEED_MULT, K.SPEED_CAP);
  return {
    ...b,
    x: side === "left" ? K.P1_X1 + K.BALL_R : K.P2_X0 - K.BALL_R,
    vx: (side === "left" ? 1 : -1) * sp * Math.cos(th),
    vy: sp * Math.sin(th),
    spin: cl(b.spin + p.vy * K.SPIN_FROM_PADDLE, -K.SPIN_CLAMP, K.SPIN_CLAMP),
  };
}
function hitObstacle(
  b: BallState,
  o: DeepReadonly<ObstacleState>,
  e: Events,
): BallState {
  const c = Math.cos(o.theta),
    s = Math.sin(o.theta),
    dx = b.x - o.cx,
    dy = b.y - o.cy,
    lx = dx * c + dy * s,
    ly = -dx * s + dy * c,
    qx = cl(lx, -K.OBSTACLE_HW, K.OBSTACLE_HW),
    qy = cl(ly, -K.OBSTACLE_HH, K.OBSTACLE_HH),
    ox = lx - qx,
    oy = ly - qy;
  if (ox * ox + oy * oy >= K.BALL_R * K.BALL_R) return b;
  let nxL = 0,
    nyL = 0,
    dist: number;
  if (ox || oy) {
    dist = Math.hypot(ox, oy);
    nxL = ox / dist;
    nyL = oy / dist;
  } else {
    const px = K.OBSTACLE_HW - Math.abs(lx),
      py = K.OBSTACLE_HH - Math.abs(ly);
    if (px <= py) {
      nxL = lx < 0 ? -1 : 1;
      dist = -px;
    } else {
      nyL = ly < 0 ? -1 : 1;
      dist = -py;
    }
  }
  const push = K.BALL_R - dist,
    plx = lx + nxL * push,
    ply = ly + nyL * push,
    nx = nxL * c - nyL * s,
    ny = nxL * s + nyL * c,
    dot = b.vx * nx + b.vy * ny;
  e.obstacle = true;
  return {
    ...b,
    x: o.cx + plx * c - ply * s,
    y: o.cy + plx * s + ply * c,
    vx: dot < 0 ? b.vx - 2 * dot * nx : b.vx,
    vy: dot < 0 ? b.vy - 2 * dot * ny : b.vy,
  };
}
function physics(
  source: DeepReadonly<BallState>,
  ps: DeepReadonly<CaromState["paddles"]>,
  os: DeepReadonly<readonly ObstacleState[]>,
  dt: number,
): { ball: BallState; events: Events } {
  let b: BallState = { ...source, trail: source.trail.map((p) => ({ ...p })) };
  const events = { wall: false, paddle: false, obstacle: false },
    steps = Math.max(
      1,
      Math.ceil((Math.hypot(b.vx, b.vy) * dt) / K.MAX_SUBSTEP),
    ),
    h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const speed = Math.hypot(b.vx, b.vy);
    if (speed) {
      const an = (b.spin / speed) * h,
        c = Math.cos(an),
        s = Math.sin(an);
      b = { ...b, vx: b.vx * c - b.vy * s, vy: b.vx * s + b.vy * c };
    }
    b = {
      ...b,
      spin: b.spin * 0.5 ** (h / K.SPIN_HALFLIFE),
      x: b.x + b.vx * h,
      y: b.y + b.vy * h,
    };
    if (b.y - K.BALL_R < 0 && b.vy < 0) {
      b = { ...b, y: K.BALL_R, vy: -b.vy };
      events.wall = true;
    } else if (b.y + K.BALL_R > K.FIELD_H && b.vy > 0) {
      b = { ...b, y: K.FIELD_H - K.BALL_R, vy: -b.vy };
      events.wall = true;
    }
    b = hitPaddle(b, ps.left, K.P1_X0, K.P1_X1, "left", events);
    b = hitPaddle(b, ps.right, K.P2_X0, K.P2_X1, "right", events);
    for (const o of os) b = hitObstacle(b, o, events);
  }
  return { ball: b, events };
}
function world(s: RO, a: UpdateApi, dt: number): CaromState {
  const n = cp(s),
    ps = paddles(s, a, dt);
  let b = n.ball,
    screen = n.screen,
    score = n.score,
    winner = n.winner,
    receiver = n.receiver,
    menuIndex = n.menuIndex;
  if (b && s.screen === "countdown") {
    const hold = b.holdTimer - dt;
    if (hold <= 0) {
      const dir = s.receiver === "left" ? -1 : 1;
      b = {
        ...b,
        holdTimer: 0,
        held: false,
        vx: dir * K.SERVE_SPEED * Math.cos(K.SERVE_ANGLE),
        vy: b.serveSign * K.SERVE_SPEED * Math.sin(K.SERVE_ANGLE),
        trail: [],
      };
      screen = "playing";
    } else b = { ...b, holdTimer: hold };
  } else if (b && s.screen === "playing" && !b.held) {
    const r = physics(b, ps, s.obstacles, dt);
    b = r.ball;
    if (r.events.wall) a.audio.play(K.CUES.wallBounce);
    if (r.events.paddle) a.audio.play(K.CUES.paddleHit);
    if (r.events.obstacle) a.audio.play(K.CUES.obstacleBounce);
    let scorer: Side | null = null;
    if (b.x - K.BALL_R > K.FIELD_W) scorer = "left";
    else if (b.x + K.BALL_R < 0) scorer = "right";
    if (scorer) {
      a.audio.play(K.CUES.score);
      score = {
        p1: score.p1 + (scorer === "left" ? 1 : 0),
        p2: score.p2 + (scorer === "right" ? 1 : 0),
      };
      const won =
        (score.p1 >= K.WIN_SCORE && score.p1 - score.p2 >= K.WIN_LEAD) ||
        (score.p2 >= K.WIN_SCORE && score.p2 - score.p1 >= K.WIN_LEAD);
      if (won) {
        winner = scorer;
        screen = "matchover";
        menuIndex = 0;
      } else {
        receiver = scorer === "left" ? "right" : "left";
        b = ball();
        screen = "countdown";
      }
    }
  }
  const simTime = s.simTime + dt;
  if (b)
    b = {
      ...b,
      trail: [...b.trail, { x: b.x, y: b.y, t: simTime }].filter(
        (p) => p.t >= simTime - K.TRAIL_TIME,
      ),
    };
  const clock = s.obstacleClockRunning ? s.obstacleClock + dt : s.obstacleClock;
  return {
    ...n,
    screen,
    score,
    winner,
    receiver,
    menuIndex,
    paddles: ps,
    ball: b,
    simTime,
    obstacleClock: clock,
    obstacles: s.obstacles.map((o) => pose(o.index, clock)),
  };
}
function debug(): CaromDebugApi {
  const req = (s: RO): BallState => {
      if (!s.ball) throw new Error("ball is not present");
      return { ...s.ball, trail: s.ball.trail.map((p) => ({ ...p })) };
    },
    setBall = (s: RO, c: Partial<BallState>): CaromState => ({
      ...cp(s),
      ball: { ...req(s), ...c },
    }),
    setPad = (s: RO, side: Side, c: Partial<PaddleState>): CaromState => {
      const n = cp(s);
      return {
        ...n,
        paddles: { ...n.paddles, [side]: { ...n.paddles[side], ...c } },
      };
    };
  return {
    version: K.CAROM_DEBUG_VERSION,
    clearWorld: (s) => ({ ...cp(s), ball: null, obstacles: [] }),
    spawnBall: (s) => ({ ...cp(s), ball: ball() }),
    spawnObstacle: (s, i) => {
      if (i !== 0 && i !== 1) throw new RangeError(`no obstacle ${i}`);
      return {
        ...cp(s),
        obstacles: [
          ...s.obstacles.filter((o) => o.index !== i).map((o) => ({ ...o })),
          pose(i, s.obstacleClock),
        ].sort((a, b) => a.index - b.index),
      };
    },
    reset: (s) => fresh(s.muted),
    reconcile: (s) => ({
      ...cp(s),
      obstacles: s.obstacles.map((o) => pose(o.index, s.obstacleClock)),
    }),
    setScreen: (s, screen) => ({ ...cp(s), screen }),
    setMode: (s, mode) => ({ ...cp(s), mode }),
    setMenuIndex: (s, menuIndex) => ({ ...cp(s), menuIndex }),
    setTitleIndex: (s, titleIndex) => ({ ...cp(s), titleIndex }),
    setResumeScreen: (s, resumeScreen) => ({ ...cp(s), resumeScreen }),
    setScore: (s, p1, p2) => ({ ...cp(s), score: { p1, p2 } }),
    setWinner: (s, winner) => ({ ...cp(s), winner }),
    setReceiver: (s, receiver) => ({ ...cp(s), receiver }),
    setPaddleCy: (s, v, cy) => setPad(s, v, { cy }),
    setPaddleVy: (s, v, drivenVy) => setPad(s, v, { drivenVy }),
    setPaddleDriven: (s, v, driven) => setPad(s, v, { driven }),
    setBallPosition: (s, x, y) => setBall(s, { x, y }),
    setBallVelocity: (s, vx, vy) => setBall(s, { vx, vy }),
    setBallSpin: (s, spin) => setBall(s, { spin }),
    setBallHeld: (s, held) => setBall(s, { held }),
    setBallHoldTimer: (s, holdTimer) => setBall(s, { holdTimer }),
    setBallServeSign: (s, serveSign) => {
      if (serveSign !== 1 && serveSign !== -1)
        throw new RangeError("serve sign must be 1 or -1");
      return setBall(s, { serveSign });
    },
    drawBallServeSign: (s) => setBall(s, { serveSign: sign() }),
    setAiTracking: (s, tracking) => ({ ...cp(s), ai: { ...s.ai, tracking } }),
    setAiMovement: (s, movement) => ({ ...cp(s), ai: { ...s.ai, movement } }),
    setMuted: (s, muted) => ({ ...cp(s), muted }),
    setObstacleClock: (s, obstacleClock) => ({
      ...cp(s),
      obstacleClock,
      obstacles: s.obstacles.map((o) => pose(o.index, obstacleClock)),
    }),
    setObstacleClockRunning: (s, obstacleClockRunning) => ({
      ...cp(s),
      obstacleClockRunning,
    }),
    snapshot: (s) => ({
      screen: s.screen,
      mode: s.mode,
      menuIndex: s.menuIndex,
      titleIndex: s.titleIndex,
      resumeScreen: s.resumeScreen,
      score: { ...s.score },
      winner: s.winner,
      paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
      ai: { ...s.ai },
      receiver: s.receiver,
      ball: s.ball
        ? {
            ...s.ball,
            trail: s.ball.trail.map((p) => ({ ...p })),
            speed: Math.hypot(s.ball.vx, s.ball.vy),
          }
        : null,
      obstacles: s.obstacles.map((o) => pose(o.index, s.obstacleClock)),
      obstacleClock: s.obstacleClock,
      obstacleClockRunning: s.obstacleClockRunning,
      simTime: s.simTime,
      muted: s.muted,
      version: K.CAROM_DEBUG_VERSION,
    }),
    menuItemRect: rect,
  };
}

function rounded(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}
function txt(
  c: CanvasRenderingContext2D,
  v: string,
  x: number,
  y: number,
  size: number,
  color = "#eefaff",
  align: CanvasTextAlign = "center",
): void {
  c.fillStyle = color;
  c.font = `700 ${size}px system-ui,sans-serif`;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.fillText(v, x, y);
}
function field(s: RO, c: CanvasRenderingContext2D, dim = false): void {
  c.fillStyle = BACKGROUND;
  c.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
  c.save();
  c.globalAlpha = dim ? 0.28 : 1;
  const g = c.createRadialGradient(
    K.FIELD_CX,
    K.FIELD_CY,
    50,
    K.FIELD_CX,
    K.FIELD_CY,
    700,
  );
  g.addColorStop(0, "#103146");
  g.addColorStop(1, BACKGROUND);
  c.fillStyle = g;
  c.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
  c.strokeStyle = "#31566b";
  c.lineWidth = 3;
  c.setLineDash([12, 16]);
  c.beginPath();
  c.moveTo(K.NET_X, 25);
  c.lineTo(K.NET_X, K.FIELD_H - 25);
  c.stroke();
  c.setLineDash([]);
  for (const o of s.obstacles) {
    c.save();
    c.translate(o.cx, o.cy);
    c.rotate(o.theta);
    c.shadowColor = "#ffad35";
    c.shadowBlur = 20;
    c.fillStyle = "#ff9e2c";
    rounded(
      c,
      -K.OBSTACLE_W / 2,
      -K.OBSTACLE_H / 2,
      K.OBSTACLE_W,
      K.OBSTACLE_H,
      10,
    );
    c.restore();
  }
  for (const [x, p, color] of [
    [K.P1_X0, s.paddles.left, "#38e8ff"],
    [K.P2_X0, s.paddles.right, "#ff4f9a"],
  ] as const) {
    c.shadowColor = color;
    c.shadowBlur = 20;
    c.fillStyle = color;
    rounded(c, x, p.cy - K.PADDLE_HALF, K.PADDLE_W, K.PADDLE_H, 8);
  }
  c.shadowBlur = 0;
  if (s.ball) {
    s.ball.trail.forEach((p, i) => {
      c.globalAlpha =
        (((dim ? 0.28 : 1) * (i + 1)) / s.ball!.trail.length) * 0.4;
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(p.x, p.y, (K.BALL_R * (i + 1)) / s.ball!.trail.length, 0, TAU);
      c.fill();
    });
    c.globalAlpha = dim ? 0.28 : 1;
    c.shadowColor = "#fff";
    c.shadowBlur = 18;
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(s.ball.x, s.ball.y, K.BALL_R, 0, TAU);
    c.fill();
  }
  c.restore();
}
function menu(
  s: RO,
  c: CanvasRenderingContext2D,
  items: readonly string[],
): void {
  items.forEach((v, i) => {
    const r = rect(s, i);
    if (!r) return;
    const on = s.menuIndex === i;
    c.fillStyle = on ? "rgba(56,232,255,.2)" : "rgba(5,17,29,.8)";
    c.strokeStyle = on ? "#38e8ff" : "#31566b";
    c.lineWidth = on ? 3 : 1;
    rounded(c, r.x, r.y, r.w, r.h, 14);
    c.strokeRect(r.x, r.y, r.w, r.h);
    txt(c, v, K.FIELD_CX, r.y + r.h / 2, 23, on ? "#fff" : "#a8becb");
  });
}
function scores(s: RO, c: CanvasRenderingContext2D): void {
  txt(c, String(s.score.p1), K.FIELD_CX - 90, 72, 52, "#38e8ff");
  txt(c, String(s.score.p2), K.FIELD_CX + 90, 72, 52, "#ff4f9a");
  txt(
    c,
    s.mode === "solo" ? "SOLO // HUMAN vs CIRCUIT" : "VERSUS // LOCAL DUEL",
    K.FIELD_CX,
    126,
    15,
    "#7495a7",
  );
}

export const game: Game<CaromState, CaromDebugApi> = {
  initialize(a: InitApi<CaromState>) {
    for (const name of K.ACTIONS)
      a.input.register(name, { keys: [...K.BINDINGS[name]] });
    a.audio.define(K.CUES.paddleHit, {
      wave: "square",
      freq: 260,
      freqTo: 520,
      durationMs: 70,
      gain: 0.16,
    });
    a.audio.define(K.CUES.wallBounce, {
      wave: "triangle",
      freq: 180,
      freqTo: 130,
      durationMs: 60,
      gain: 0.12,
    });
    a.audio.define(K.CUES.obstacleBounce, {
      wave: "sawtooth",
      freq: 420,
      freqTo: 250,
      durationMs: 85,
      gain: 0.1,
    });
    a.audio.define(K.CUES.score, {
      freq: 440,
      freqTo: 880,
      durationMs: 220,
      gain: 0.18,
    });
    a.diagnostics.register("screen", (s) => s.screen);
    a.diagnostics.register("mode", (s) => s.mode);
    a.diagnostics.register("score", (s) => `${s.score.p1}-${s.score.p2}`);
    a.diagnostics.register("ball pos", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)}, ${s.ball.y.toFixed(1)}` : "none",
    );
    a.diagnostics.register("ball velocity", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)}, ${s.ball.vy.toFixed(1)}` : "none",
    );
    a.diagnostics.register("ball speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : 0,
    );
    a.diagnostics.register("ball spin", (s) => s.ball?.spin ?? 0);
    a.diagnostics.register(
      "left paddle",
      (s) =>
        `${s.paddles.left.cy.toFixed(1)} @ ${s.paddles.left.vy.toFixed(1)}`,
    );
    a.diagnostics.register(
      "right paddle",
      (s) =>
        `${s.paddles.right.cy.toFixed(1)} @ ${s.paddles.right.vy.toFixed(1)}`,
    );
    return [fresh(false), debug()];
  },
  update(s, a, dt) {
    const n = input(s, a);
    return n.screen === "countdown" || n.screen === "playing"
      ? world(n, a, dt)
      : { ...n, simTime: s.simTime + dt };
  },
  render(s, a) {
    const c = a.ctx,
      overlay =
        s.screen === "title" ||
        s.screen === "howto" ||
        s.screen === "paused" ||
        s.screen === "matchover";
    field(s, c, overlay);
    if (
      s.screen === "countdown" ||
      s.screen === "playing" ||
      s.screen === "paused" ||
      s.screen === "matchover"
    )
      scores(s, c);
    if (s.screen === "title") {
      txt(c, K.TITLE_TEXT, K.FIELD_CX, 190, 112, "#f4fbff");
      txt(c, "BEND THE ANGLE", K.FIELD_CX, 272, 18, "#ffb13b");
      menu(s, c, K.TITLE_ITEMS);
    } else if (s.screen === "howto") {
      txt(c, "HOW TO PLAY", K.FIELD_CX, 92, 44);
      txt(c, "W / S — left paddle", 290, 200, 22, "#38e8ff", "left");
      txt(c, "↑ / ↓ — right paddle", 290, 246, 22, "#ff4f9a", "left");
      txt(c, "Move through contact to add spin.", K.FIELD_CX, 350, 25);
      txt(
        c,
        "Curve around the rotating bars—or bank straight off them.",
        K.FIELD_CX,
        396,
        21,
        "#ffbf62",
      );
      txt(
        c,
        "First to 11, win by 2.  P pauses.  M mutes.",
        K.FIELD_CX,
        468,
        18,
        "#93adba",
      );
      menu(s, c, ["BACK"]);
    } else if (s.screen === "countdown") {
      txt(
        c,
        String(Math.max(1, Math.ceil(s.ball?.holdTimer ?? 0))),
        K.FIELD_CX,
        K.FIELD_CY,
        80,
      );
      txt(c, "READY", K.FIELD_CX, K.FIELD_CY + 62, 16, "#ffb13b");
    } else if (s.screen === "paused") {
      txt(c, "PAUSED", K.FIELD_CX, 280, 48);
      menu(s, c, K.PAUSE_ITEMS);
    } else if (s.screen === "matchover") {
      const win =
        s.winner === "left"
          ? "PLAYER ONE WINS"
          : s.mode === "solo"
            ? "CIRCUIT WINS"
            : "PLAYER TWO WINS";
      txt(
        c,
        win,
        K.FIELD_CX,
        265,
        48,
        s.winner === "left" ? "#38e8ff" : "#ff4f9a",
      );
      txt(c, `${s.score.p1}  —  ${s.score.p2}`, K.FIELD_CX, 325, 26);
      menu(s, c, K.MATCHOVER_ITEMS);
    }
  },
};
