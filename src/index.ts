import { createPublicClient, getContract, http } from "viem";
import { mainnet } from "viem/chains";
import { realityEthV3_0Abi, realityModuleEthAbi } from "./generated";
import { Context, Proposal } from "./types";
import { getSnapshotSpace } from "./snapshot";
import dotenv from "dotenv";

dotenv.config();

const { MAINNET_RPC_URL, SNAPSHOT_SPACE_ID } = process.env;
if (!MAINNET_RPC_URL || !SNAPSHOT_SPACE_ID) {
  throw new Error(
    "Please provide a value for the expected environment variables",
  );
}

const context: Context = {
  watchers: [],
  proposals: [],
};

const getContracts = async (snapshotSpaceId: string) => {
  const snapshotSpace = await getSnapshotSpace(snapshotSpaceId);
  const realityModuleAddress = snapshotSpace.plugins.safeSnap.address;
  const client = createPublicClient({
    chain: mainnet,
    transport: http(MAINNET_RPC_URL),
  });
  const realityModule = getContract({
    client,
    address: realityModuleAddress,
    abi: realityModuleEthAbi,
  });
  const realityOracleAddress = await realityModule.read.oracle();
  const realityOracle = getContract({
    client,
    address: realityOracleAddress,
    abi: realityEthV3_0Abi,
  });
  return { realityModule, realityOracle };
};

const main = async () => {
  const { realityModule, realityOracle } = await getContracts(SNAPSHOT_SPACE_ID);
  const watchRealityAnswers = (proposal: Proposal) => {
    return realityOracle.watchEvent.LogNewAnswer(
      {
        question_id: proposal.questionId,
      },
      {
        onLogs: (logs) => {
          logs.forEach((log) => {
            proposal.answers.push({
              answer: log.args.answer,
              bond: log.args.bond,
              timestamp: Number(log.args.ts),
              user: log.args.user,
            });
            console.log(
              `New answer: ${log.args.answer} with bond: ${log.args.bond}`,
            );

            // TODO: blast notifications via email, slack, telegram...
          });
        },
      },
    );
  };
  const watchRealityModuleProposals = () => {
    return realityModule.watchEvent.ProposalQuestionCreated(
      {
        // no argument filter
      },
      {
        onLogs: (logs) => {
          logs.forEach((log) => {
            if (log.args.questionId) {
              const proposal: Proposal = {
                proposalId: log.args.proposalId,
                questionId: log.args.questionId,
                answers: [],
              };
              context.proposals.push(proposal);
              context.watchers.push(watchRealityAnswers(proposal));
              console.log(
                `New question: ${log.args.questionId} with proposalId: ${log.args.proposalId}`,
              );
            }
          });
        },
      },
    );
  };
  context.watchers.push(watchRealityModuleProposals()); // WARNING: check if this is a blocking call, otherwise it will exit the process
};

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    context.watchers.forEach((watcher) => watcher());
  });
