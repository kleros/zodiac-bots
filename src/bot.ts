import { EventEmitter } from "node:events";
import { BotEventNames } from "./bot-events";
import { processSpaces } from "./processing";
import { findSpaces, insertSpaces, type FindSpacesFn, type InsertSpacesFn } from "./services/db/spaces";
import { initialize as initializeEmail } from "./services/email";
import { initialize as initializeHeartbeat } from "./services/heartbeat";
import { getSpaceAddresses } from "./services/reality";
import { initialize as initializeSlack } from "./services/slack";
import { initialize as initializeTelegram } from "./services/telegram";
import type { ParsedSpace, Space } from "./types";
import { defaultEmitter, resolveOnEvent } from "./utils/emitter";
import { env, parseSpacesEnv } from "./utils/env";
import isPromisePending from "./utils/is-promise-pending";
import { initialize as initializeLogger } from "./utils/logger";
import { initialize as initializeGracefulShutdown } from "./utils/shutdown";

export type StartFn = () => Promise<void>;
/**
 * Entry point for the bot logic
 *
 * Intialize the libraries required for operations, recovers previous execution
 * state and starts processing spaces.
 */
export const start: StartFn = () => {
  return configurableStart({
    emitter: defaultEmitter,
    initializeSpacesFn: initializeSpaces,
    parsedSpaces: parseSpacesEnv(env.SPACES),
    processSpacesFn: processSpaces,
    initializeLoggerFn: initializeLogger,
    initializeSlackFn: initializeSlack,
    initializeTelegramFn: initializeTelegram,
    initializeEmailFn: initializeEmail,
    initializeGracefulShutdownFn: initializeGracefulShutdown,
    initializeHeartbeatFn: initializeHeartbeat,
    waitForFn: waitFor,
    batchCooldown: env.BATCH_COOLDOWN,
  });
};

export type ConfigurableStartDeps = {
  emitter: EventEmitter;
  initializeSpacesFn: InitializeSpacesFn;
  parsedSpaces: ParsedSpace[];
  processSpacesFn: typeof processSpaces;
  initializeLoggerFn: typeof initializeLogger;
  initializeSlackFn: typeof initializeSlack;
  initializeTelegramFn: typeof initializeTelegram;
  initializeEmailFn: typeof initializeEmail;
  initializeGracefulShutdownFn: typeof initializeGracefulShutdown;
  initializeHeartbeatFn: typeof initializeHeartbeat;
  waitForFn: WaitForFn;
  batchCooldown: number;
};
export const configurableStart = async (deps: ConfigurableStartDeps) => {
  const {
    emitter,
    initializeLoggerFn,
    initializeSlackFn,
    initializeTelegramFn,
    initializeSpacesFn,
    initializeEmailFn,
    initializeGracefulShutdownFn,
    initializeHeartbeatFn,
    parsedSpaces,
    processSpacesFn,
    waitForFn,
    batchCooldown,
  } = deps;

  initializeLoggerFn(emitter);
  initializeGracefulShutdownFn();
  emitter.emit(BotEventNames.STARTED);
  initializeSlackFn();
  initializeTelegramFn();
  initializeEmailFn();
  initializeHeartbeatFn();

  let spaces = await initializeSpacesFn(parsedSpaces);

  const shutdownSignalPromise = resolveOnEvent(BotEventNames.GRACEFUL_SHUTDOWN_START, emitter);
  let shouldContinue = await isPromisePending(shutdownSignalPromise);

  while (shouldContinue) {
    emitter.emit(BotEventNames.ITERATION_STARTED);
    spaces = await processSpacesFn(spaces);
    emitter.emit(BotEventNames.ITERATION_ENDED);

    await Promise.race([waitForFn(batchCooldown), shutdownSignalPromise]);
    shouldContinue = await isPromisePending(shutdownSignalPromise);
  }

  emitter.emit(BotEventNames.PROCESSING_ENDED);
};

type InitializeSpacesFn = (parsedSpaces: ParsedSpace[]) => Promise<Space[]>;
/**
 * Given a list of ens/starting block pairs, provides a complete Space object with the latest
 * processed block (if any) and the reality module/oracle address.
 *
 * @param parsedSpaces - The list of ens and starting block pairs
 * @returns An enhanced list of spaces with latest processed block and reality module/oracle addresses
 *
 * @example
 *
 * const spaces = await initializeSpaces([{ ens: 'kleros.eth', startBlock: 1_000 }])
 */
export const initializeSpaces: InitializeSpacesFn = async (parsedSpaces) => {
  return configurableInitializeSpaces({
    parsedSpaces,
    emitter: defaultEmitter,
    getSpaceAddressesFn: getSpaceAddresses,
    findSpacesFn: findSpaces,
    insertSpacesFn: insertSpaces,
  });
};

export type ConfigurableInitializeSpacesDeps = {
  parsedSpaces: ParsedSpace[];
  emitter: EventEmitter;
  getSpaceAddressesFn: typeof getSpaceAddresses;
  findSpacesFn: FindSpacesFn;
  insertSpacesFn: InsertSpacesFn;
};
export const configurableInitializeSpaces = async (deps: ConfigurableInitializeSpacesDeps): Promise<Space[]> => {
  const { parsedSpaces, getSpaceAddressesFn, findSpacesFn, insertSpacesFn } = deps;

  const enss = parsedSpaces.map((space) => space.ens);

  const [addresses, recovered] = await Promise.all([
    Promise.all(
      parsedSpaces.map(({ ens, moduleAddress }) => {
        return getSpaceAddressesFn({ spaceId: ens, moduleAddress });
      }),
    ),
    findSpacesFn(enss),
  ]);

  const isAddressMissing = addresses.length < enss.length;
  if (isAddressMissing) throw new Error("Unable to resolve addresses for all spaces");

  const isNewSpacePresent = recovered.length < enss.length;
  if (isNewSpacePresent) {
    const recoveredEnss = recovered.map(({ ens }) => ens);
    const newSpaces = parsedSpaces
      .filter(({ ens }) => !recoveredEnss.includes(ens))
      .map((space) => ({
        ...space,
        lastProcessedBlock: null,
      }));
    await insertSpacesFn(newSpaces);
    recovered.push(...newSpaces);
  }

  return parsedSpaces.map(({ ens, startBlock }, i) => {
    const { lastProcessedBlock } = recovered.find((space) => ens === space.ens)!;
    return {
      ens,
      startBlock,
      lastProcessedBlock,
      ...addresses[i],
    };
  });
};

export type WaitForFn = (durationInMs: number) => Promise<void>;
/**
 * Returns a promise that resolves after a certain amount of milliseconds.
 *
 * @example
 * await waitFor(1_000);
 * console.log('This message appears after a second')
 */
export const waitFor: WaitForFn = async (durationInMs: number) => {
  return new Promise((resolve) => setTimeout(resolve, durationInMs));
};
