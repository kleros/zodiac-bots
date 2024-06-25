import EventEmitter from "node:events";
import { expect, resolveOnEvent } from "./tests-setup";
import { configurableInitialize, configurableStopServices } from "./shutdown";
import { BotEventNames } from "../bot-events";
import sinon from "sinon";
import { connect, disconnect, test } from "../services/db/connection";
import { env } from "./env";

describe("Graceful Shutdown", () => {
  const signals: NodeJS.Signals[] = ["SIGHUP", "SIGINT", "SIGTERM", "SIGQUIT"];
  signals.forEach((signal) => {
    it(`should handle the shutdown sequence on ${signal}`, async () => {
      const emitter = new EventEmitter();
      const processMock = new EventEmitter() as NodeJS.Process;
      const stopServices = sinon.spy();
      configurableInitialize({ emitter, process: processMock, stopServicesFn: stopServices });

      const signalDetected = resolveOnEvent(BotEventNames.SHUTDOWN_SIGNALED, emitter);
      const shutdownStarted = resolveOnEvent(BotEventNames.GRACEFUL_SHUTDOWN_START, emitter);

      processMock.emit(signal);

      await Promise.all([
        expect(signalDetected, "event for signal detection not emitted").to.eventually.be.fulfilled,
        expect(shutdownStarted, "event for shutdown start not emitted").to.eventually.be.fulfilled,
      ]);
    });
  });

  describe("stopServices", () => {
    const fn = configurableStopServices;

    it("should disconnect the database", async () => {
      const connection = connect(env.DB_URI);
      const stopHeartbeat = sinon.spy();

      await fn({
        connection,
        disconnectDBFn: disconnect,
        stopHeartbeatFn: stopHeartbeat,
      });

      expect(stopHeartbeat.calledOnce, "stopHeartbeat not called").to.be.true;
      await expect(test(connection), "DB still available").to.eventually.be.rejected;
    });
  });
});
