import { EventEmitter } from "stream";
import { botEventNames } from "./bot-events";
import { scheduler, type SchedulerFn } from "./schedule/schedule";
import {
  getLogNewAnswer,
  getProposalQuestionsCreated,
  getRealityModuleAddress,
  getRealityOracleAddress,
} from "./services/reality";
import { defaultEmitter } from "./utils/emitter";

export type StartFn = () => Promise<void>;
/**
 * Entry point for the bot logic.
 *
 * Resolves the required addresses/context and starts scanning blocks
 */
export const start: StartFn = () => {
  return configurableStart({
    emitter: defaultEmitter,
    schedulerFn: scheduler,
    processFn: () => Promise.resolve(),
  });
};

export type ConfigurableStartDeps = {
  emitter: EventEmitter;
  schedulerFn: SchedulerFn;
  processFn: (start: bigint, end: bigint) => Promise<void>;
};
export const configurableStart = async (deps: ConfigurableStartDeps) => {
  const { emitter, schedulerFn } = deps;
  emitter.emit(botEventNames.START);

  const moduleAddress = await getRealityModuleAddress("1inch.eth");
  if (!moduleAddress) throw new Error("Unable to resolve Reality Module contract address");
  const oracleAddress = await getRealityOracleAddress(moduleAddress);
  if (!oracleAddress) throw new Error("Unable to resolve Reality Oracle contract address");

  schedulerFn({
    intervalInSeconds: 5,
    onBlocksFound: async (fromBlock: bigint, toBlock: bigint) => {
      console.log("Processing from", fromBlock, "to", toBlock);
      const [newProposals, votes] = await Promise.all([
        getProposalQuestionsCreated({
          realityModuleAddress: moduleAddress,
          fromBlock,
          toBlock,
        }),
        getLogNewAnswer({
          realityOracleAddress: oracleAddress,
          fromBlock,
          toBlock,
        }),
      ]);

      // TODO: Example effects. Change these to telegram/email/slack notifications
      if (newProposals.length) {
        console.log("Found new proposals", newProposals);
      }
      if (votes.length) {
        console.log("Found new votes", votes);
      }
      if (!newProposals.length || !votes.length) {
        console.log("No events in this block range");
      }
    },
  });
};
