import { LogNewAnswer, ProposalQuestionCreated } from "./services/reality";
import { Space } from "./types";

export const enum BotEventNames {
  START = "start",
  TRANSPORT_CONFIGURATION_MISSING = "transport_configuration_missing",
  TRANSPORT_READY = "transport_ready",
  ITERATION_STARTED = "iteration_started",
  ITERATION_ENDED = "iteration_ended",
  SPACE_STARTED = "space_started",
  SPACE_SKIPPED = "space_skipped",
  SPACE_EVENTS_FETCHED = "space_events_fetched",
  SPACE_NOTIFIED = "space_notified",
  SPACE_ENDED = "space_ended",
}

export type SpaceStartedPayload = {
  space: Space;
};

export type SpaceSkippedPayload = {
  space: Space;
  fromBlock: bigint;
  toBlock: bigint;
};

export type SpaceDetailedPayload = SpaceSkippedPayload & {
  proposals: ProposalQuestionCreated[];
  answers: LogNewAnswer[];
};

export type TransportConfigurationMissingPayload = {
  name: string;
  missing: string[];
};

export type TransportReadyPayload = {
  name: string;
};
