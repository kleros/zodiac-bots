import EventEmitter from "node:events";
import { spy } from "sinon";
import { EventType, NotifyParams } from "./notify";
import { configurableProcessSpace } from "./processing";
import { findSpaces, insertSpaces, updateSpace } from "./services/db/spaces";
import { Space } from "./types";
import { ONEINCH_MODULE_ADDRESS, ONEINCH_ORACLE_ADDRESS, expect } from "./utils/tests-setup";

const generateRandomEns = () => `test${Math.floor(Math.random() * 1000000)}.eth`;

describe("processSpace", () => {
  const fn = configurableProcessSpace;

  const space: Space = {
    ens: generateRandomEns(),
    startBlock: 1n,
    lastProcessedBlock: 19475120n,
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
    const notifyFn = spy();
    const emitter = new EventEmitter();

    const toBlock = 19475121n;

    const result = await fn({
      space,
      blockNumber: toBlock,
      calculateBlockRangeFn: () => ({
        fromBlock: 19475120n,
        toBlock,
      }),
      emitter,
      notifyFn,
      updateSpaceFn: updateSpace,
    });

    expect(result.lastProcessedBlock).to.equal(toBlock);
    expect(notifyFn.calledOnce).to.be.true;
    const call = notifyFn.firstCall.firstArg;
    expect(call).to.deep.equal({
      type: EventType.PROPOSAL_QUESTION_CREATED,
      space,
      event: {
        proposalId: "0x791b3d71ea14497d3b8e756479f6f126e08b44351bfab904834c56b1ccf0479a",
        questionId: "0xebf5b601fedfaa5562a03590e9ac8be937cc070a131443af01948a7eda6dfabf",
        txHash: "0x890ddd7826fcd79ff17b54368e8df393959f269847ceeb0fea13cc4b68330d43",
        blockNumber: 19475120n,
      },
    } as NotifyParams);

    const [updatedSpace] = await findSpaces([space.ens]);
    expect(updatedSpace.lastProcessedBlock).to.equal(toBlock);
  });

  it("should process answers correctly", async () => {
    const notifyFn = spy();
    const emitter = new EventEmitter();

    space.lastProcessedBlock = 19640300n;
    const toBlock = 19640301n;

    const result = await fn({
      space,
      blockNumber: toBlock,
      calculateBlockRangeFn: () => ({
        fromBlock: space.lastProcessedBlock!,
        toBlock,
      }),
      emitter,
      notifyFn,
      updateSpaceFn: updateSpace,
    });

    expect(result.lastProcessedBlock).to.equal(toBlock);
    expect(notifyFn.calledOnce).to.be.true;
    const call = notifyFn.firstCall.firstArg;
    expect(call).to.deep.equal({
      type: EventType.NEW_ANSWER,
      space,
      event: {
        questionId: "0x8566ba6b1ac945f2b152a20ecc7cb3a87982190190af14cb4fbc85e12eb474e2",
        answer: "0x0000000000000000000000000000000000000000000000000000000000000001",
        user: "0x4D6CAa3E0983fAc7B514D60339EBb538C5A85AAe",
        bond: 10000000n,
        ts: 1712934227,
        txHash: "0x0cc20c32ee428bdb8f16fa1aa22b396ecafa91b61bc2c3350723e4dfefeebff0",
        blockNumber: 19640300n,
      },
    } as NotifyParams);

    const [updatedSpace] = await findSpaces([space.ens]);
    expect(updatedSpace.lastProcessedBlock).to.equal(toBlock);
  });
});
