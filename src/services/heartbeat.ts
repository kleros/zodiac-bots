import type EventEmitter from "node:events";
import { BotEventNames } from "../bot-events";
import { defaultEmitter } from "../utils/emitter";
import { env } from "../utils/env";

export let interval: NodeJS.Timeout | undefined;

/**
 * Periodically perform a HTTP GET request to the configured HEARTBEAT_URL.
 *
 * @example
 *
 * initialize();
 */
export const initialize = () => configurableInitialize({ env, emitter: defaultEmitter });

type ConfigurableInitializeDeps = {
  env: typeof env;
  emitter: EventEmitter;
};
export const configurableInitialize = (deps: ConfigurableInitializeDeps) => {
  const { env, emitter } = deps;

  const { HEARTBEAT_URL, HEARTBEAT_INTERVAL } = env;
  if (!HEARTBEAT_URL || !HEARTBEAT_INTERVAL) {
    emitter.emit(BotEventNames.HEARTBEAT_CONFIGURATION_MISSING);
    return;
  }

  if (interval) clearInterval(interval);
  interval = setInterval(() => {
    fetch(HEARTBEAT_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Status code != 2XX");
        emitter.emit(BotEventNames.HEARTBEAT_SENT);
      })
      .catch(() => emitter.emit(BotEventNames.HEARTBEAT_FAILED));
  }, HEARTBEAT_INTERVAL);

  emitter.emit(BotEventNames.HEARTBEAT_READY);
};

/**
 * Cancels the periodic heartbeat request.
 */
export const stop = () => {
  clearInterval(interval);
  interval = undefined;
};
