import EventEmitter from "node:events";
import { BotEventNames } from "../bot-events";
import { DBConnection, disconnect as disconnectDB, getConnection as getDBConnection } from "../services/db/connection";
import { defaultEmitter } from "./emitter";

/**
 * Shuts down the application with order to ensure no data is lost or batch gets
 * mid-processed
 */
export const initialize = () => {
  return configurableInitialize({
    process,
    emitter: defaultEmitter,
    stopServicesFn: stopServices,
  });
};

type ConfigurableInitializeDeps = {
  emitter: EventEmitter;
  process: NodeJS.Process;
  stopServicesFn: typeof stopServices;
};
export const configurableInitialize = (deps: ConfigurableInitializeDeps) => {
  const { emitter, process, stopServicesFn } = deps;

  emitter.on(BotEventNames.PROCESSING_ENDED, stopServicesFn);

  const signals: NodeJS.Signals[] = ["SIGHUP", "SIGINT", "SIGTERM", "SIGQUIT"];
  for (const signal of signals) {
    process.on(signal, () => {
      emitter.emit(BotEventNames.SHUTDOWN_SIGNALED);
      emitter.emit(BotEventNames.GRACEFUL_SHUTDOWN_START);
    });
  }

  const fatalErrorEvents = ["unhandledRejection", "uncaughtException"];
  for (const errorEvent of fatalErrorEvents) {
    process.on(errorEvent, (error: Error) => {
      emitter.emit(BotEventNames.ERROR, error);
      emitter.emit(BotEventNames.GRACEFUL_SHUTDOWN_START);
    });
  }
};

/**
 * Stops all the long-running operation that may block the exit.
 *
 * This are usually depending services that shouldn't be closed until the
 * processing finishes
 */
const stopServices = () => {
  return configurableStopServices({
    disconnectDBFn: disconnectDB,
    connection: getDBConnection(),
  });
};

type ConfigurableStopServicesDeps = {
  disconnectDBFn: typeof disconnectDB;
  connection: DBConnection;
};
export const configurableStopServices = async (deps: ConfigurableStopServicesDeps) => {
  const { connection, disconnectDBFn } = deps;
  await disconnectDBFn(connection);
};
