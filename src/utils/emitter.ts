import { EventEmitter } from "node:events";
import { BotEventNames } from "../bot-events";

export const defaultEmitter = new EventEmitter();

/**
 * Waits asynchronously for an EventEmitter event
 *
 * @param name The name of the event
 * @param emitter The emitter that should emit the event
 *
 * @returns A promise that resolves to an array of event arguments
 *
 * @example
 *
 * const emitter = new EventEmitter();
 * const promise = resolveOnEvent("my-event", emitter);
 * emitter.emit("my-event", "content")
 * const payload = await promise; // payload is ["content"]
 */
export const resolveOnEvent = <R = [unknown, ...unknown[]]>(name: BotEventNames, emitter: EventEmitter): Promise<R> =>
  new Promise((resolve) => {
    emitter.on(name, (...args) => {
      resolve(args as R);
    });
  });
