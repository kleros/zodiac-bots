import { waitFor } from "../bot";
import isPromisePending from "./is-promise-pending";
import { expect } from "./tests-setup";

describe("isPromisePending", () => {
  const fn = isPromisePending;

  it("should return false for an already resolved promise", async () => {
    const resolvedPromise = Promise.resolve("success");
    const result = await fn(resolvedPromise);
    expect(result).to.be.false;
  });

  it("should return false for an already rejected promise", async () => {
    const rejectedPromise = Promise.reject("error").catch(() => {});
    await rejectedPromise;
    const result = await fn(rejectedPromise);
    expect(result).to.be.false;
  });

  it("should return true for a pending promise", async () => {
    const pendingPromise = new Promise(() => {});
    const result = await fn(pendingPromise);
    expect(result).to.be.true;
  });

  it("should return false for a promise that resolves after a delay", async () => {
    const delayedPromise = waitFor(100);

    await waitFor(150);
    const resultAfterDelay = await fn(delayedPromise);
    expect(resultAfterDelay).to.be.false;
  });

  it("should return false for a promise that rejects after a delay", async () => {
    const delayedRejectPromise = new Promise((_, reject) => setTimeout(reject, 100)).catch(() => {});
    await waitFor(150);
    const resultAfterDelay = await fn(delayedRejectPromise);
    expect(resultAfterDelay).to.be.false;
  });
});
