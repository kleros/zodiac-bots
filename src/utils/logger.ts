import pino from "pino";
import { EventEmitter } from "stream";
import { SpaceDetailedPayload, SpaceSkippedPayload, SpaceStartedPayload, BotEventNames as event } from "../bot-events";

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

  emitter.on(event.START, () => {
    logger.info("Bot started");
  });

  emitter.on(event.SLACK_CONFIGURATION_MISSING, () => {
    logger.warn("Slack configuration missing. Ignoring transport");
  });

  emitter.on(event.SLACK_STARTED, () => {
    logger.info("Slack transport configured");
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
};
