import { decodeEventLog, getAddress, type AbiEvent, type Address, type Hash } from "viem";
import { realityModuleEthConfig as realityModule, realityEthV3_0Config as realityOracle } from "./abi";
import { env } from "../../utils/env";
import { graphQLFetch } from "../../utils/fetch-graphql";
import { getPublicClient } from "../provider";

const PROPOSAL_QUESTION_CREATED_EVENT_NAME = "ProposalQuestionCreated";
const LOG_NEW_ANSWER_EVENT_NAME = "LogNewAnswer";

// Look for the events ABI
const PROPOSAL_QUESTION_CREATED_ABI = realityModule.abi.find(
  (event) => "name" in event && event.name === PROPOSAL_QUESTION_CREATED_EVENT_NAME,
) as AbiEvent | undefined;
const LOG_NEW_ANSWER_ABI = realityOracle.abi.find(
  (event) => "name" in event && event.name === LOG_NEW_ANSWER_EVENT_NAME,
) as AbiEvent | undefined;

if (!PROPOSAL_QUESTION_CREATED_ABI || !LOG_NEW_ANSWER_ABI) {
  throw new Error(`Unable to find events in ABI`);
}

type QueryResponse = {
  space: {
    plugins: {
      safeSnap: {
        address: Address;
      };
    };
  };
};
/**
 * Get the address of the Reality Module contract for a given space
 *
 * @param spaceId - The ID of the space to get the contract address for
 * @returns The address of the contract
 *
 * @example
 *
 * const address = await getRealityModuleAddress("1inch.eth");
 */
type GetRealityModuleAddressFn = (spaceId: string) => Promise<Address | null>;
export const getRealityModuleAddress: GetRealityModuleAddressFn = async (spaceId) => {
  const query = `
    query {
      space(id: "${spaceId}") {
        plugins
      }
    }
  `;
  const { space } = await graphQLFetch<QueryResponse>(env.SNAPSHOT_GRAPHQL_URL, query);

  return space ? space.plugins.safeSnap.address : null;
};

type GetRealityOracleAddressFn = (realityModuleAddress: Address) => Promise<Address | null>;
/**
 * Return the address of the Oracle contract for a given Reality Module
 *
 * @param realityModuleAddress - The address of the Reality Module
 * @returns The address of the Oracle contract
 *
 * @example
 * const address = await getRealityOracleAddress("0xa62D2a75eb39C12e908e9F6BF50f189641692F2E");
 */
export const getRealityOracleAddress: GetRealityOracleAddressFn = async (realityModuleAddress) => {
  return getPublicClient().readContract({
    address: getAddress(realityModuleAddress),
    abi: realityModule.abi,
    functionName: "oracle",
  });
};

export type SpaceAddresses = {
  moduleAddress: Address;
  oracleAddress: Address;
};
export type GetSpaceAddressesOpts = {
  spaceId: string;
  moduleAddress?: Address;
};
/**
 * Return the address of the Oracle and Reality Module contracts for a given Space
 *
 * @param spaceId - The ENS of the space
 * @returns The address of the Oracle and Reality Module contracts
 *
 * @example
 *
 * const { moduleAddress, oracleAddress } = await getSpaceAddresses("1inch.eth");
 */
export const getSpaceAddresses = async (opts: GetSpaceAddressesOpts): Promise<SpaceAddresses> => {
  const { spaceId, moduleAddress } = opts;
  return configurableGetSpaceAddresses({
    spaceId,
    moduleAddress,
    getRealityModuleAddressFn: getRealityModuleAddress,
    getRealityOracleAddressFn: getRealityOracleAddress,
  });
};

type ConfigurableGetSpaceAddressesDeps = {
  spaceId: string;
  moduleAddress?: Address;
  getRealityModuleAddressFn: GetRealityModuleAddressFn;
  getRealityOracleAddressFn: GetRealityOracleAddressFn;
};
export const configurableGetSpaceAddresses = async (
  deps: ConfigurableGetSpaceAddressesDeps,
): Promise<SpaceAddresses> => {
  const { spaceId, getRealityModuleAddressFn, getRealityOracleAddressFn, moduleAddress: providedModuleAddress } = deps;

  let moduleAddress = providedModuleAddress;

  if (!moduleAddress) {
    const resolvedModuleAddress = await getRealityModuleAddressFn(spaceId);
    if (!resolvedModuleAddress) {
      throw new Error(`Unable to resolve module contract address for space ${spaceId}`);
    }

    moduleAddress = resolvedModuleAddress;
  }

  const oracleAddress = await getRealityOracleAddressFn(moduleAddress);
  if (!oracleAddress) {
    throw new Error(`Unable to resolve oracle contract address for space ${spaceId}`);
  }

  return { moduleAddress, oracleAddress };
};

/**
 * Given a block number, return the date it was mined
 *
 * @param blockNumber - The block number to get the date for
 * @returns The date the block was mined
 *
 * @example
 * const date = await getBlockDate(100n);
 */
const getBlockDate = async (blockNumber: bigint): Promise<Date> => {
  const block = await getPublicClient().getBlock({ blockNumber });

  // JS date accepts epoch as Number (not BigInt) of milliseconds
  const epochInMs = Number(block.timestamp) * 1000;
  return new Date(epochInMs);
};

export type ProposalQuestionCreated = {
  proposalId: Hash;
  questionId: Hash;

  txHash: Hash;
  blockNumber: bigint;
  happenedAt: Date;
};
type GetProposalQuestionsCreatedArgs = {
  realityModuleAddress: Address;
  fromBlock: bigint;
  toBlock: bigint;
};
type GetProposalQuestionsCreatedFn = (args: GetProposalQuestionsCreatedArgs) => Promise<ProposalQuestionCreated[]>;
/**
 * Looks for `ProposalQuestionCreated` events on the Reality Module betwen `fromBlock` and `toBlock`.
 *
 * @returns An array of `ProposalQuestionCreated` events
 *
 * @example
 *
 * const proposals = await getProposalQuestionsCreated("0xa62D2a75eb39C12e908e9F6BF50f189641692F2E", 100n, 200n);
 */
export const getProposalQuestionsCreated: GetProposalQuestionsCreatedFn = async (args) => {
  const { realityModuleAddress, fromBlock, toBlock } = args;
  const publicClient = getPublicClient();

  const logs = await publicClient.getLogs({
    event: PROPOSAL_QUESTION_CREATED_ABI,
    address: realityModuleAddress,
    fromBlock,
    toBlock,
  });
  const events: ProposalQuestionCreated[] = await Promise.all(
    logs.map(async (log) => {
      const decoded = decodeEventLog({
        abi: realityModule.abi,
        eventName: PROPOSAL_QUESTION_CREATED_EVENT_NAME,
        data: log.data,
        topics: log.topics,
      });

      const happenedAt = await getBlockDate(log.blockNumber);

      return {
        proposalId: decoded.args.proposalId as Hash,
        questionId: decoded.args.questionId as Hash,

        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        happenedAt,
      };
    }),
  );
  return events;
};

export type LogNewAnswer = {
  questionId: Hash;
  answer: Hash;
  bond: bigint;
  user: Address;

  blockNumber: bigint;
  txHash: Hash;
  happenedAt: Date;
};

type GetLogNewAnswerArgs = {
  realityOracleAddress: Address;
  fromBlock: bigint;
  toBlock: bigint;
};
type GetLogNewAnswerFn = (args: GetLogNewAnswerArgs) => Promise<LogNewAnswer[]>;
/**
 * Looks for `LogNewAnswer` events on the Reality Oracle betwen `fromBlock` and `toBlock`.
 *
 * @returns An array of `LogNewAnswer` events
 * @example
 *
 * const fromBlock = 19640300n;
 * const toBlock = fromBlock + 100;
 * const answers = await getLogNewAnswer("0x5b7dD1E86623548AF054A4985F7fc8Ccbb554E2", fromBlock, toBlock);
 */
export const getLogNewAnswer: GetLogNewAnswerFn = async (args) => {
  const { realityOracleAddress, fromBlock, toBlock } = args;
  const publicClient = getPublicClient();

  const logs = await publicClient.getLogs({
    event: LOG_NEW_ANSWER_ABI,
    address: realityOracleAddress,
    fromBlock,
    toBlock,
  });
  const events: LogNewAnswer[] = logs.map((log) => {
    const decoded = decodeEventLog({
      abi: realityOracle.abi,
      eventName: LOG_NEW_ANSWER_EVENT_NAME,
      data: log.data,
      topics: log.topics,
    });

    const epochInMs = Number(decoded.args.ts) * 1000;
    const happenedAt = new Date(epochInMs);

    return {
      questionId: decoded.args.question_id,
      answer: decoded.args.answer,
      bond: decoded.args.bond,
      user: decoded.args.user,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      happenedAt,
    };
  });
  return events;
};
