import { install, InstalledClock } from "@sinonjs/fake-timers";
import {
  setIntervalAsync,
  SetIntervalAsyncHandler,
} from "set-interval-async/dynamic";
import { strict as assert } from "assert";
import sinon from "sinon";

describe("[Dynamic] setIntervalAsync", () => {
  let clock: InstalledClock;

  beforeEach(() => {
    clock = install();
  });

  afterEach(() => {
    clock.uninstall();
  });

  it("should fail if handler is not a function", async () => {
    const invalidHandlers = [null, undefined, 0, "str", {}, []];
    const intervalMs = 1000;
    for (const invalidHandler of invalidHandlers) {
      try {
        setIntervalAsync(
          invalidHandler as unknown as SetIntervalAsyncHandler<[]>,
          intervalMs
        );
        assert.fail("Did not throw");
      } catch (err: unknown) {
        assert.ok(err instanceof TypeError);
      }
    }
  });

  it("should fail if interval is not a number", async () => {
    const handlerDurationMs = 100;
    const handler = createHandlerForTest(handlerDurationMs);
    const invalidIntervalMss = [null, undefined, "str", {}, [], new Function()];
    for (const invalidIntervalMs of invalidIntervalMss) {
      try {
        setIntervalAsync(handler, invalidIntervalMs as number);
        assert.fail("Did not throw");
      } catch (err: unknown) {
        assert.ok(err instanceof TypeError);
      }
    }
  });

  it("should run every intervalMs when intervalMs > handlerDurationMs", async () => {
    const iterationCount = 100;
    const intervalMs = 1000;
    const handlerDurationMs = 100;
    const success = await runTest(
      iterationCount,
      intervalMs,
      handlerDurationMs
    );
    assert.ok(success);
  });

  it("should run every intervalMs when intervalMs = handlerDurationMs", async () => {
    const iterationCount = 100;
    const intervalMs = 100;
    const handlerDurationMs = 100;
    const success = await runTest(
      iterationCount,
      intervalMs,
      handlerDurationMs
    );
    assert.ok(success);
  });

  it("should run every handlerDurationMs when intervalMs < handlerDurationMs", async () => {
    const iterationCount = 100;
    const intervalMs = 100;
    const handlerDurationMs = 1000;
    const handler = createHandlerForTest(handlerDurationMs);
    setIntervalAsync(handler, intervalMs);
    await clock.nextAsync();
    assert.equal(getCurrentTime(), intervalMs);
    await clock.nextAsync();
    assert.equal(getCurrentTime(), intervalMs + handlerDurationMs);
    for (let iteration = 2; iteration <= iterationCount; ++iteration) {
      await clock.nextAsync();
      assert.equal(
        getCurrentTime(),
        intervalMs + (iteration - 1) * handlerDurationMs
      );
      await clock.nextAsync();
      assert.equal(
        getCurrentTime(),
        intervalMs + iteration * handlerDurationMs
      );
    }
    assert.equal(handler.callCount, iterationCount);
  });

  it("should continue running even if handler throws error", async () => {
    const iterationCount = 100;
    const intervalMs = 100;
    const handler = sinon.fake(async () => {
      throw new Error("Some Error");
    });
    setIntervalAsync(handler, intervalMs);
    for (let iteration = 1; iteration <= iterationCount; ++iteration) {
      await clock.nextAsync();
    }
    assert.equal(handler.callCount, iterationCount);
  });

  async function runTest(
    iterationCount: number,
    intervalMs: number,
    handlerDurationMs: number
  ) {
    const handler = createHandlerForTest(handlerDurationMs);
    setIntervalAsync(handler, intervalMs);
    for (let iteration = 1; iteration <= iterationCount; ++iteration) {
      await clock.nextAsync();
      assert.equal(getCurrentTime(), iteration * intervalMs);
      await clock.nextAsync();
      assert.equal(
        getCurrentTime(),
        iteration * intervalMs + handlerDurationMs
      );
    }
    assert.equal(handler.callCount, iterationCount);
    return true;
  }

  function createHandlerForTest(
    handlerDurationMs: number
  ): sinon.SinonSpy<[], Promise<void>> {
    return sinon.fake(async () => {
      await new Promise((resolve) =>
        clock.setTimeout(resolve, handlerDurationMs)
      );
    });
  }

  function getCurrentTime(): number {
    return new clock.Date().getTime();
  }
});
