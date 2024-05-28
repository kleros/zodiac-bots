import { EventEmitter } from "node:events";
import sinon from "sinon";
import {
  ConfigurableInitializeSpacesDeps,
  ConfigurableStartDeps,
  configurableInitializeSpaces,
  configurableStart,
} from "./bot";
import { BotEventNames } from "./bot-events";
import { findSpaces, insertSpaces } from "./services/db/spaces";
import { getSpaceAddresses } from "./services/reality";
import { expect } from "./utils/tests-setup";

describe("Bot", () => {
  describe(".start", () => {
    const fn = configurableStart;

    let depsMock = {} as ConfigurableStartDeps;
    beforeEach(() => {
      let isShouldContinueCalled = false;
      depsMock = {
        parsedSpaces: [],
        emitter: new EventEmitter(),
        initializeLoggerFn: sinon.spy(),
        initializeSlackFn: sinon.spy(),
        initializeSpacesFn: sinon.spy(),
        shouldContinueFn: () => {
          const returned = !isShouldContinueCalled;
          isShouldContinueCalled = true;
          return returned;
        },
        processSpacesFn: sinon.spy(),
        waitForFn: () => Promise.resolve(),
      };
    });

    it("should emit the expected events", async () => {
      const detectEvent = (name: BotEventNames) =>
        new Promise((resolve) => {
          depsMock.emitter.on(name, resolve);
        });

      const promises = Promise.all([
        detectEvent(BotEventNames.START),
        detectEvent(BotEventNames.ITERATION_STARTED),
        detectEvent(BotEventNames.ITERATION_ENDED),
      ]);

      await fn(depsMock);

      return expect(promises).to.eventually.fulfilled;
    });

    it("should initialize required libraries", async () => {
      await fn(depsMock);

      const { initializeLoggerFn, initializeSlackFn } = depsMock;
      expect((initializeLoggerFn as sinon.SinonSpy).calledOnce).to.be.true;
      expect((initializeSlackFn as sinon.SinonSpy).calledOnce).to.be.true;
    });
  });

  describe("initializeSpaces", () => {
    const fn = configurableInitializeSpaces;

    let deps = {} as ConfigurableInitializeSpacesDeps;
    beforeEach(() => {
      deps = {
        parsedSpaces: [],
        emitter: new EventEmitter(),
        getSpaceAddressesFn: getSpaceAddresses,
        findSpacesFn: findSpaces,
        insertSpacesFn: insertSpaces,
      };
    });

    it("should handle new spaces is processed", async () => {
      const parsedSpace = {
        ens: "1inch.eth",
        startBlock: 1234n,
      };

      deps.parsedSpaces = [parsedSpace];
      const results = await fn(deps);

      expect(results).to.have.lengthOf(1);
      const result = results[0];

      expect(result.ens).to.equal(parsedSpace.ens);
      expect(result.startBlock).to.equal(parsedSpace.startBlock);
      expect(result.lastProcessedBlock).to.be.null;
      expect(result.moduleAddress).to.exist;
      expect(result.oracleAddress).to.exist;

      const [stored] = await findSpaces([parsedSpace.ens]);
      expect(stored.ens).to.equal(parsedSpace.ens);
      expect(stored.startBlock).to.equal(parsedSpace.startBlock);
    });
  });
});
