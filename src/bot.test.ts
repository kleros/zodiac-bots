import { EventEmitter } from "node:events";
import sinon from "sinon";
import {
  configurableInitializeSpaces,
  configurableStart,
  waitFor,
  type ConfigurableInitializeSpacesDeps,
  type ConfigurableStartDeps,
} from "./bot";
import { BotEventNames } from "./bot-events";
import { findSpaces, insertSpaces } from "./services/db/spaces";
import { getSpaceAddresses } from "./services/reality";
import { expect, resolveOnEvent } from "./utils/tests-setup";

describe("Bot", () => {
  describe(".start", () => {
    const fn = configurableStart;

    let depsMock = {} as ConfigurableStartDeps;
    beforeEach(() => {
      depsMock = {
        parsedSpaces: [],
        emitter: new EventEmitter(),
        initializeLoggerFn: sinon.spy(),
        initializeSlackFn: sinon.spy(),
        initializeTelegramFn: sinon.spy(),
        initializeEmailFn: sinon.spy(),
        initializeSpacesFn: sinon.spy(),
        initializeGracefulShutdownFn: sinon.spy(),
        processSpacesFn: sinon.spy(),
        waitForFn: waitFor,
        batchCooldown: 300,
      };
    });

    afterEach(() => {
      // Trigger a shutdown event so the function stops processing blocks
      depsMock.emitter.emit(BotEventNames.GRACEFUL_SHUTDOWN_START);
    });

    it("should emit the expected events", async () => {
      const { emitter } = depsMock;

      const promises = Promise.all([
        resolveOnEvent(BotEventNames.STARTED, emitter),
        resolveOnEvent(BotEventNames.ITERATION_STARTED, emitter),
        resolveOnEvent(BotEventNames.ITERATION_ENDED, emitter),
      ]);

      fn(depsMock);

      await expect(promises).to.eventually.fulfilled;
    });

    it("should initialize required libraries", async () => {
      fn(depsMock);

      await resolveOnEvent(BotEventNames.ITERATION_STARTED, depsMock.emitter);

      expect((depsMock.initializeLoggerFn as sinon.SinonSpy).calledOnce, "logger failed").to.be.true;
      expect((depsMock.initializeSlackFn as sinon.SinonSpy).calledOnce, "slack failed").to.be.true;
      expect((depsMock.initializeTelegramFn as sinon.SinonSpy).calledOnce, "telegram failed").to.be.true;
      expect((depsMock.initializeEmailFn as sinon.SinonSpy).calledOnce, "email failed").to.be.true;
      expect((depsMock.initializeGracefulShutdownFn as sinon.SinonSpy).calledOnce, "graceful shutdown failed").to.be
        .true;
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

    it("should handle spaces no previously processed", async () => {
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
