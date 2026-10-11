import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { describe, expect, it } from "vitest";
import { FIELD_H, FIELD_W, HOLD_TIME, SERVE_SPEED } from "./constants";
import { game } from "./game";

function harness(step = 10) {
  const canvas = createCanvas(FIELD_W, FIELD_H);
  const events = new EventTarget();
  return createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: FIELD_W,
    height: FIELD_H,
    game,
    clock: new ConstantClock(step),
    surface: {
      cssWidth: () => FIELD_W,
      cssHeight: () => FIELD_H,
      dpr: () => 1,
      events: () => events,
    },
  });
}

describe("Carom simulation", () => {
  it("initializes the complete title world and debug surface", async () => {
    const engine = harness();
    await engine.initialize();
    const shot = engine.debug.snapshot(engine.state);
    expect(shot.screen).toBe("title");
    expect(shot.ball?.holdTimer).toBe(HOLD_TIME);
    expect(shot.obstacles).toHaveLength(2);
    expect(engine.debug.menuItemRect(engine.state, 0)).not.toBeNull();
    engine.destroy();
  });

  it("serves toward the receiver when the countdown expires", async () => {
    const engine = harness(10);
    await engine.initialize();
    engine.apply((s) => engine.debug.setScreen(s, "countdown"));
    engine.apply((s) => engine.debug.setBallServeSign(s, 1));
    await engine.advance(101);
    const shot = engine.debug.snapshot(engine.state);
    expect(shot.screen).toBe("playing");
    expect(shot.ball?.speed).toBeCloseTo(SERVE_SPEED, 5);
    expect(shot.ball?.vx).toBeLessThan(0);
    expect(shot.ball?.vy).toBeGreaterThan(0);
    engine.destroy();
  });

  it("resolves wall bounces and scoring through real frames", async () => {
    const engine = harness(4);
    await engine.initialize();
    engine.apply((s) => engine.debug.setScreen(s, "playing"));
    engine.apply((s) => engine.debug.setBallHeld(s, false));
    engine.apply((s) => engine.debug.setBallPosition(s, 640, 12));
    engine.apply((s) => engine.debug.setBallVelocity(s, 0, -500));
    await engine.advance(2);
    expect(engine.debug.snapshot(engine.state).ball?.vy).toBeGreaterThan(0);
    engine.apply((s) => engine.debug.setBallPosition(s, FIELD_W + 20, 360));
    engine.apply((s) => engine.debug.setBallVelocity(s, 500, 0));
    await engine.advance(1);
    expect(engine.debug.snapshot(engine.state).score.p1).toBe(1);
    expect(engine.debug.snapshot(engine.state).screen).toBe("countdown");
    engine.destroy();
  });

  it("poses driven paddles and moving obstacle geometry immutably", async () => {
    const engine = harness(10);
    await engine.initialize();
    const before = engine.state;
    engine.apply((s) => engine.debug.setScreen(s, "playing"));
    engine.apply((s) => engine.debug.setPaddleDriven(s, "left", true));
    engine.apply((s) => engine.debug.setPaddleVy(s, "left", 300));
    await engine.advance(10);
    const shot = engine.debug.snapshot(engine.state);
    expect(shot.paddles.left.cy).toBeGreaterThan(360);
    expect(shot.obstacles[0]?.cy).not.toBe(220);
    expect(before.screen).toBe("title");
    engine.destroy();
  });

  it("clears, respawns, and validates debug entities", async () => {
    const engine = harness();
    await engine.initialize();
    engine.apply((s) => engine.debug.clearWorld(s));
    expect(engine.debug.snapshot(engine.state).ball).toBeNull();
    expect(() => engine.apply((s) => engine.debug.setBallSpin(s, 1))).toThrow();
    engine.apply((s) => engine.debug.spawnBall(s));
    engine.apply((s) => engine.debug.spawnObstacle(s, 1));
    expect(engine.debug.snapshot(engine.state).obstacles).toHaveLength(1);
    engine.destroy();
  });
});
