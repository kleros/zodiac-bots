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
export type GetSpaceAddressesFn = (spaceId: string) => Promise<SpaceAddresses>;
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
export const getSpaceAddresses: GetSpaceAddressesFn = async (spaceId) => {
  return configurableGetSpaceAddresses({
    spaceId,
    getRealityModuleAddressFn: getRealityModuleAddress,
    getRealityOracleAddressFn: getRealityOracleAddress,
  });
};

type ConfigurableGetSpaceAddressesDeps = {
  spaceId: string;
  getRealityModuleAddressFn: GetRealityModuleAddressFn;
  getRealityOracleAddressFn: GetRealityOracleAddressFn;
};
export const configurableGetSpaceAddresses = async (
  deps: ConfigurableGetSpaceAddressesDeps,
): Promise<SpaceAddresses> => {
  const { spaceId, getRealityModuleAddressFn, getRealityOracleAddressFn } = deps;
  const moduleAddress = await getRealityModuleAddressFn(spaceId);
  if (!moduleAddress) {
    throw new Error(`Unable to resolve module contract address for space ${spaceId}`);
  }

  const oracleAddress = await getRealityOracleAddressFn(moduleAddress);
  if (!oracleAddress) {
    throw new Error(`Unable to resolve oracle contract address for space ${spaceId}`);
  }

  return { moduleAddress, oracleAddress };
};

export type ProposalQuestionCreated = {
  proposalId: string;
  questionId: string;

  txHash: Hash;
  blockNumber: bigint;
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
  const events: ProposalQuestionCreated[] = logs.map((log) => {
    const decoded = decodeEventLog({
      abi: realityModule.abi,
      eventName: PROPOSAL_QUESTION_CREATED_EVENT_NAME,
      data: log.data,
      topics: log.topics,
    });

    return {
      proposalId: decoded.args.proposalId,
      questionId: decoded.args.questionId,

      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
    };
  });
  return events;
};

export type LogNewAnswer = {
  questionId: Hash;
  answer: Hash;
  bond: bigint;
  user: Address;
  ts: Number;

  blockNumber: bigint;
  txHash: Hash;
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

    return {
      questionId: decoded.args.question_id,
      answer: decoded.args.answer,
      bond: decoded.args.bond,
      user: decoded.args.user,
      ts: Number(decoded.args.ts),
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
    };
  });
  return events;
};
