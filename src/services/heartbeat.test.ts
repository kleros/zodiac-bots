import http from "node:http";
import { expect, resolveOnEvent } from "../utils/tests-setup";
import { configurableInitialize, interval } from "./heartbeat";
import EventEmitter from "node:events";
import { AddressInfo } from "node:net";
import { Env } from "../utils/env";
import { BotEventNames } from "../bot-events";
import { waitFor } from "../bot";

const createFakeServer = async (statusCode: number, onQuery?: Function) => {
  const server = http.createServer((_, res) => {
    if (onQuery) onQuery();
    res.writeHead(statusCode);
    res.end();
  });

  await new Promise((resolve) => server.listen(0, () => resolve(null)));

  return server;
};

describe("Heartbeat", () => {
  const fn = configurableInitialize;

  afterEach(() => {
    if (interval) clearInterval(interval);
  });

  describe("initialize", () => {
    it("should send a heartbeat every interval", async () => {
      const expectedCalls = 4;

      let httpCalls = 0;
      const server = await createFakeServer(200, () => httpCalls++);
      const { port } = server.address() as AddressInfo;

      const emitter = new EventEmitter();
      let sentEvents = 0;
      emitter.on(BotEventNames.HEARTBEAT_SENT, () => sentEvents++);

      const interval = 100;
      const env = {
        HEARTBEAT_URL: `http://localhost:${port}/test`,
        HEARTBEAT_INTERVAL: interval,
      } as Env;

      const transportReadyEventPromise = resolveOnEvent(BotEventNames.HEARTBEAT_READY, emitter);

      fn({ emitter, env });

      await waitFor(expectedCalls * interval + interval * 0.5);
      server.close();

      expect(httpCalls).to.equal(expectedCalls, "web server received less calls than expected");
      expect(sentEvents).to.equal(expectedCalls, "event emitter received less calls than expected");
      await expect(transportReadyEventPromise, "transport ready event not emitted").to.eventually.be.fulfilled;
    });

    it("should emit an event when the request fails", async () => {
      const server = await createFakeServer(404);
      const { port } = server.address() as AddressInfo;

      const emitter = new EventEmitter();
      const interval = 10;
      const env = {
        HEARTBEAT_URL: `http://localhost:${port}/test`,
        HEARTBEAT_INTERVAL: interval,
      } as Env;

      const failedEventPromise = resolveOnEvent(BotEventNames.HEARTBEAT_READY, emitter);

      fn({ emitter, env });

      await waitFor(interval * 1.5);
      server.close();

      await expect(failedEventPromise, "heartbeat failure event not emitted").to.eventually.be.fulfilled;
    });

    it("should emit an event when the URL is missing", async () => {
      const emitter = new EventEmitter();
      const env = {
        HEARTBEAT_URL: undefined,
        HEARTBEAT_INTERVAL: interval,
      } as any as Env;

      const unconfiguredEventPromise = resolveOnEvent(BotEventNames.HEARTBEAT_CONFIGURATION_MISSING, emitter);
      fn({ emitter, env });
      await expect(unconfiguredEventPromise, "url missing and event not emitted").to.eventually.be.fulfilled;
    });
  });
});

