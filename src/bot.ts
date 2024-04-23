import { Proposal, Context } from "./types";
import { getContracts } from "./contracts";

export type OnNewProposalHandler = (proposal: Proposal) => void;
export type OnNewAnswerHandler = (proposal: Proposal) => void;

export const context: Context = {
  watchers: [],
  proposals: [],
};

export const start = async (
  snapshotSpaceId: string,
  newProposalHandler: OnNewProposalHandler,
  newAnswerHandler: OnNewAnswerHandler,
) => {
  const { realityModule, realityOracle } = await getContracts(snapshotSpaceId);
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
            console.log(`New answer: ${log.args.answer} with bond: ${log.args.bond}`);
            newAnswerHandler(proposal); // TODO: blast notifications via email, slack, telegram...
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
              console.log(`New question: ${log.args.questionId} with proposalId: ${log.args.proposalId}`);
              newProposalHandler(proposal);
            }
          });
        },
      },
    );
  };
  console.debug("Watching...");
  context.watchers.push(watchRealityModuleProposals()); // WARNING: check if this is a blocking call, otherwise it will exit the process
  console.debug("Exiting...");
};

export const stop = () => {
  console.debug("Stopping...");
  context.watchers.forEach((watcher) => watcher());
};
