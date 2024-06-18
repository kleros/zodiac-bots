import type { EventEmitter } from "node:events";
import pino from "pino";
import {
  SpaceDetailedPayload,
  SpaceSkippedPayload,
  SpaceStartedPayload,
  TransportConfigurationMissingPayload,
  TransportReadyPayload,
  BotEventNames as event,
} from "../bot-events";

/**
 * Listens to relevant events of an EventEmitter instance and issues log lines
 *
 * @param emitter - The event emitter instance that issues the relevant events
 *
 * @example
 *
 * const emitter = new EventEmitter();
 * initialize(emitter);
 */
export const initialize = (emitter: EventEmitter) => {
  return configurableInitialize({ emitter, logger: pino() });
};

type ConfigurableInitializeDeps = {
  emitter: EventEmitter;
  logger: ReturnType<typeof pino>;
};
export const configurableInitialize = (deps: ConfigurableInitializeDeps) => {
  const { emitter, logger } = deps;

  emitter.on(event.STARTED, () => {
    logger.info("Bot started");
  });

  emitter.on(event.TRANSPORT_CONFIGURATION_MISSING, (payload: TransportConfigurationMissingPayload) => {
    logger.warn(
      `Transport "${payload.name}" not starting. The following environment variables are missing: ${payload.missing.join(", ")}`,
    );
  });

  emitter.on(event.TRANSPORT_READY, (payload: TransportReadyPayload) => {
    logger.info(`Transport "${payload.name}" is ready`);
  });

  emitter.on(event.ITERATION_STARTED, () => {
    logger.info("Checking all the spaces for new events");
  });

  emitter.on(event.ITERATION_ENDED, () => {
    logger.info("All spaces checked. Sleeping for a while...");
  });

  emitter.on(event.SPACE_STARTED, (payload: SpaceStartedPayload) => {
    logger.info(payload, `Processing of ${payload.space.ens} started`);
  });

  emitter.on(event.SPACE_SKIPPED, (payload: SpaceSkippedPayload) => {
    logger.info(payload, `Skipping ${payload.space.ens} due to insufficient blocks`);
  });

  emitter.on(event.SPACE_EVENTS_FETCHED, (payload: SpaceDetailedPayload) => {
    const { space, proposals, answers } = payload;
    const total = proposals.length + answers.length;
    logger.info(payload, `Fetched ${total} events for ${space.ens}`);
  });

  emitter.on(event.SPACE_NOTIFIED, (payload: SpaceDetailedPayload) => {
    const { space } = payload;
    logger.info({ space }, `Notifications for ${space.ens} events sent`);
  });

  emitter.on(event.SPACE_ENDED, (payload: SpaceDetailedPayload) => {
    const { space } = payload;
    logger.info({ space }, `Processing of ${payload.space.ens} ended`);
  });

  emitter.on(event.SHUTDOWN_SIGNALED, () => {
    logger.warn("Shutdown signal detected");
  });

  emitter.on(event.ERROR, (error: Error) => {
    logger.error(error, `An unexpected error occurred`);
  });

  emitter.on(event.GRACEFUL_SHUTDOWN_START, () => {
    logger.info("Starting graceful shutdown...");
  });

  emitter.on(event.PROCESSING_ENDED, () => {
    logger.info("Processing stopped. No more blocks will be scanned");
  });
};