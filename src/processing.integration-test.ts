import { EventEmitter } from "node:events";
import { spy } from "sinon";
import type { Hash } from "viem";
import { EventType, type Notification } from "./notify";
import { configurableProcessAnswers, configurableProcessProposals, configurableProcessSpace } from "./processing";
import { findProposalByQuestionId, insertProposal } from "./services/db/proposals";
import { findSpaces, insertSpaces, updateSpace } from "./services/db/spaces";
import { getLogNewQuestion, type LogNewAnswer, type ProposalQuestionCreated } from "./services/reality";
import type { Space } from "./types";
import { randomizeAnswerEventField, randomizeEns, randomizeProposal, randomizeSpace } from "./utils/test-mocks";
import { ONEINCH_MODULE_ADDRESS, ONEINCH_ORACLE_ADDRESS, expect } from "./utils/tests-setup";

const oneInchProposalBlockNumber = 19475120n;
const oneInchAnswerBlockNumber = 19640300n;

describe("processSpace", () => {
  const fn = configurableProcessSpace;

  const space: Space = {
    ens: randomizeEns(),
    startBlock: 1n,
    lastProcessedBlock: oneInchProposalBlockNumber,
    moduleAddress: ONEINCH_MODULE_ADDRESS,
    oracleAddress: ONEINCH_ORACLE_ADDRESS,
  };

  beforeEach(async () => {
    space.ens = `test${Math.floor(Math.random() * 1000000)}.eth`;
    await insertSpaces([
      {
        ens: space.ens,
        startBlock: 1n,
        lastProcessedBlock: 1n,
      },
    ]);
  });

  it("should process proposals correctly", async () => {
    const processProposalsFn = spy();
    const processAnswersFn = spy();
    const emitter = new EventEmitter();

    const toBlock = oneInchProposalBlockNumber + 1n;

    const result = await fn({
      space,
      blockNumber: toBlock,
      calculateBlockRangeFn: () => ({
        fromBlock: oneInchProposalBlockNumber,
        toBlock,
      }),
      emitter,
      updateSpaceFn: updateSpace,
      processProposalsFn,
      processAnswersFn,
    });

    expect(result.lastProcessedBlock).to.equal(toBlock);

    expect(processProposalsFn.calledOnce).to.be.true;
    const processProposalsCall = processProposalsFn.firstCall;
    expect(processProposalsCall.args[0]).to.deep.equal(space);
    expect(processProposalsCall.args[1]).to.deep.equal([
      {
        proposalId: "0x791b3d71ea14497d3b8e756479f6f126e08b44351bfab904834c56b1ccf0479a",
        questionId: "0xebf5b601fedfaa5562a03590e9ac8be937cc070a131443af01948a7eda6dfabf" as Hash,
        txHash: "0x890ddd7826fcd79ff17b54368e8df393959f269847ceeb0fea13cc4b68330d43",
        blockNumber: oneInchProposalBlockNumber,
        happenedAt: new Date("2024-03-20T09:48:23.000Z"),
      },
    ]);

    expect(processAnswersFn.calledOnce).to.be.true;
    const processAnswersCall = processAnswersFn.firstCall;
    expect(processAnswersCall.args[1]).to.have.lengthOf(0);

    const [updatedSpace] = await findSpaces([space.ens]);
    expect(updatedSpace.lastProcessedBlock).to.equal(toBlock);
  });

  it("should process answers correctly", async () => {
    const processProposalsFn = spy();
    const processAnswersFn = spy();
    const emitter = new EventEmitter();

    space.lastProcessedBlock = oneInchAnswerBlockNumber;
    const toBlock = space.lastProcessedBlock + 1n;

    const result = await fn({
      space,
      blockNumber: toBlock,
      calculateBlockRangeFn: () => ({
        fromBlock: space.lastProcessedBlock!,
        toBlock,
      }),
      emitter,
      updateSpaceFn: updateSpace,
      processProposalsFn,
      processAnswersFn,
    });

    expect(result.lastProcessedBlock).to.equal(toBlock);

    expect(processProposalsFn.calledOnce).to.be.true;
    const processProposalsCall = processProposalsFn.firstCall;
    expect(processProposalsCall.args[1]).to.have.lengthOf(0);

    expect(processAnswersFn.calledOnce).to.be.true;
    const processAnswersCall = processAnswersFn.firstCall;
    expect(processAnswersCall.args[0]).to.deep.equal(space);
    expect(processAnswersCall.args[1]).to.deep.equal([
      {
        questionId: "0x8566ba6b1ac945f2b152a20ecc7cb3a87982190190af14cb4fbc85e12eb474e2",
        answer: "0x0000000000000000000000000000000000000000000000000000000000000001",
        user: "0x4D6CAa3E0983fAc7B514D60339EBb538C5A85AAe",
        bond: 10000000n,
        txHash: "0x0cc20c32ee428bdb8f16fa1aa22b396ecafa91b61bc2c3350723e4dfefeebff0",
        blockNumber: oneInchAnswerBlockNumber,
        happenedAt: new Date(1712934227 * 1000),
      },
    ]);

    const [updatedSpace] = await findSpaces([space.ens]);
    expect(updatedSpace.lastProcessedBlock).to.equal(toBlock);
  });
});

describe("processProposals", () => {
  const fn = configurableProcessProposals;

  const space = randomizeSpace();

  beforeEach(async () => {
    space.ens = randomizeEns();
    await insertSpaces([
      {
        ens: space.ens,
        startBlock: 1n,
        lastProcessedBlock: 1n,
      },
    ]);
  });

  it("should register the proposal and issue a notification", async () => {
    const notifyFn = spy();

    const proposal: ProposalQuestionCreated = {
      proposalId: "0x791b3d71ea14497d3b8e756479f6f126e08b44351bfab904834c56b1ccf0479a",
      questionId: "0xebf5b601fedfaa5562a03590e9ac8be937cc070a131443af01948a7eda6dfabf" as Hash,
      txHash: "0x890ddd7826fcd79ff17b54368e8df393959f269847ceeb0fea13cc4b68330d43",
      blockNumber: oneInchProposalBlockNumber,
      happenedAt: new Date("2024-03-20T09:48:23.000Z"),
    };

    const spaceWithRealOracle = {
      ...space,
      oracleAddress: ONEINCH_ORACLE_ADDRESS,
    };

    await fn({
      space: spaceWithRealOracle,
      proposals: [proposal],
      getLogNewQuestionFn: getLogNewQuestion,
      notifyFn,
      insertProposalFn: insertProposal,
    });

    expect(notifyFn.calledOnce).to.be.true;
    const call = notifyFn.firstCall.firstArg;

    expect(call).to.deep.equal({
      type: EventType.PROPOSAL_QUESTION_CREATED,
      space: spaceWithRealOracle,
      event: {
        ...proposal,
        snapshotId: "0xa455f437479cad77a20096c1717f2b23777f258060dd6a0d5882a9aebfaf8275",
        startedAt: new Date("2024-03-20T09:48:23.000Z"),
        timeout: 259200,
        finishedAt: new Date("2024-03-23T09:48:23.000Z"),
      },
    } satisfies Notification);

    const storedProposal = await findProposalByQuestionId(proposal.questionId);
    expect(storedProposal).to.not.be.null;
  });
});

describe("processAnswers", () => {
  const fn = configurableProcessAnswers;

  const space = randomizeSpace();

  beforeEach(async () => {
    space.ens = randomizeEns();
    await insertSpaces([
      {
        ens: space.ens,
        startBlock: 1n,
        lastProcessedBlock: 1n,
      },
    ]);
  });

  it("should issue a notification when is for the current space", async () => {
    const notifyFn = spy();

    const answer: LogNewAnswer = {
      questionId: "0x8566ba6b1ac945f2b152a20ecc7cb3a87982190190af14cb4fbc85e12eb474e2",
      answer: "0x0000000000000000000000000000000000000000000000000000000000000001",
      user: "0x4D6CAa3E0983fAc7B514D60339EBb538C5A85AAe",
      bond: 10000000n,
      txHash: "0x0cc20c32ee428bdb8f16fa1aa22b396ecafa91b61bc2c3350723e4dfefeebff0",
      blockNumber: oneInchAnswerBlockNumber,
      happenedAt: new Date(1712934227 * 1000),
    };

    const proposal = randomizeProposal({
      ens: space.ens,
      questionId: answer.questionId,
    });
    await insertProposal(proposal);

    await fn({
      space,
      answers: [answer],
      notifyFn,
      findProposalByQuestionIdFn: findProposalByQuestionId,
    });

    expect(notifyFn.calledOnce).to.be.true;
    const call = notifyFn.firstCall.firstArg;
    expect(call).to.deep.equal({
      type: EventType.NEW_ANSWER,
      space,
      event: {
        ...answer,
        snapshotId: proposal.snapshotId,
      },
    } satisfies Notification);
  });

  it("should ignore events that do not correspond to existing proposals", async () => {
    const notifyFn = spy();

    const answer = randomizeAnswerEventField();

    await fn({
      space,
      answers: [answer],
      notifyFn,
      findProposalByQuestionIdFn: findProposalByQuestionId,
    });

    expect(notifyFn.called).to.be.false;
  });

  it("should ignore events that do not correspond to existing space", async () => {
    const notifyFn = spy();

    const answer = randomizeAnswerEventField();

    const proposalSpace = randomizeSpace();
    await insertSpaces([proposalSpace]);

    await insertProposal(
      randomizeProposal({
        ens: proposalSpace.ens,
        questionId: answer.questionId,
      }),
    );

    await fn({
      space,
      answers: [answer],
      notifyFn,
      findProposalByQuestionIdFn: findProposalByQuestionId,
    });

    expect(notifyFn.called).to.be.false;
  });
});
