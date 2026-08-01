import { Address, Hash, Hex } from "viem";
import { SnapshotProposal } from "../../services/snapshot";
import { LogNewQuestion } from "../../services/reality";
import { assertValidRealityQuestion } from ".";
import { expect } from "chai";
import {
  MalformedSafeError,
  MalformedSafeSnapTxError,
  MissingSnapshotProposalError,
  ProposalIdMismatchError,
  SafeHashCalculationError,
  SafeHashMismatchError,
  SafeNotFoundForProposalNetworkError,
  SafeSnapPluginConfigurationError,
  TxHashMismatchError,
} from "./errors";

const cloneEvent = (): LogNewQuestion => ({
  questionId: "0xebf5b601fedfaa5562a03590e9ac8be937cc070a131443af01948a7eda6dfabf" as Hash,
  question: {
    proposalId: "0xa455f437479cad77a20096c1717f2b23777f258060dd6a0d5882a9aebfaf8275" as Hex,
    safeHash: "0x16f33619042ad909e8be177b122b02895f90e29c3cd4f17262cee4f148dca9b0" as Hash,
  },
  user: "0xa62d2a75eb39c12e908e9f6bf50f189641692f2e" as Address,
  startedAt: new Date("2024-03-20T09:48:23.000Z"),
  timeout: 259200,
  finishedAt: new Date("2024-03-23T09:48:23.000Z"),
  txHash: "0x890ddd7826fcd79ff17b54368e8df393959f269847ceeb0fea13cc4b68330d43" as Hash,
  blockNumber: 19475120n,
});

const cloneProposal = (): SnapshotProposal => ({
  id: "0xa455f437479cad77a20096c1717f2b23777f258060dd6a0d5882a9aebfaf8275" as Hex,
  title: "[1IP-53] 1inch Events 2024 Grant Proposal",
  network: "1",
  plugins: {
    safeSnap: {
      safes: [
        {
          txs: [
            {
              hash: "0xd7e437d42668cbe22aa94deed4d33ffc378679b7ed4b2a068859f3534a8e4e86" as Hash,
              nonce: 0,
              transactions: [
                {
                  to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
                  data: "0xa9059cbb000000000000000000000000da38862974b83daf69cb18a9aea898e3847b3b38000000000000000000000000000000000000000000000000000001780b392e00",
                  nonce: 0,
                  value: "0",
                  operation: "0",
                  type: "transferFunds",
                },
              ],
              mainTransaction: {
                to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address,
                data: "0xa9059cbb000000000000000000000000da38862974b83daf69cb18a9aea898e3847b3b38000000000000000000000000000000000000000000000000000001780b392e00",
                nonce: 0,
                value: "0",
                operation: "0",
                type: "transferFunds",
              },
            },
          ],
          hash: "0x16f33619042ad909e8be177b122b02895f90e29c3cd4f17262cee4f148dca9b0" as Hash,
          network: "1",
          realityAddress: "0xa62D2a75eb39C12e908e9F6BF50f189641692F2E" as Address,
          multiSendAddress: "0x8D29bE29923b68abfDD21e541b9374737B49cdAD" as Address,
        },
      ],
    },
  },
});

describe("Reality/Proposal Validation", () => {
  describe("assertValidRealityQuestion()", () => {
    const fn = assertValidRealityQuestion;

    let event: LogNewQuestion;
    let proposal: SnapshotProposal;

    beforeEach(() => {
      event = cloneEvent();
      proposal = cloneProposal();
    });

    it("should finish without errors when everything is as expected", () => {
      expect(() => fn(event, proposal)).not.to.throw();
    });

    describe("it should raise a security alert", () => {
      it("when a tx hash can not be recreated", () => {
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.value = "4242";
        expect(() => fn(event, proposal)).to.throw(TxHashMismatchError);
      });

      it("when the hash is not the keccak256 of the concatenation of tx hashes", () => {
        proposal.plugins.safeSnap.safes[0].hash = "0x0";
        expect(() => fn(event, proposal)).to.throw(SafeHashCalculationError);
      });

      it("when the reality question includes a different hash", () => {
        event.question.safeHash = "0xa";
        expect(() => fn(event, proposal)).to.throw(SafeHashMismatchError);
      });
    });

    describe("it should warn when it is missing data to perform the validation", () => {
      it("because there is not proposal", () => {
        expect(() => fn(event, null)).to.throw(MissingSnapshotProposalError);
      });

      it("because the snapshot plugin data is missing", () => {
        // @ts-ignore Force test condition
        proposal.plugins.safeSnap = null;
        expect(() => fn(event, proposal)).to.throw(SafeSnapPluginConfigurationError);
      });

      it("because no safe is found", () => {
        proposal.plugins.safeSnap.safes = [];
        expect(() => fn(event, proposal)).to.throw(SafeSnapPluginConfigurationError);
      });

      it("because the resolved proposal seems unrelated with the question", () => {
        proposal.id = "0x4242";
        expect(() => fn(event, proposal)).to.throw(ProposalIdMismatchError);
      });

      it("because no safe exists for the proposal network", () => {
        proposal.network = "50000";
        expect(() => fn(event, proposal)).to.throw(SafeNotFoundForProposalNetworkError);
      });

      it("because a safeSnap tx is missing its mainTransaction", () => {
        // @ts-ignore Force test condition
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction = undefined;
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx mainTransaction is missing a required field", () => {
        // @ts-ignore Force test condition
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.to = undefined;
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx has an unparseable numeric field", () => {
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.value = "not-a-number";
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx carries a non-integer number instead of a numeric string", () => {
        // @ts-ignore Force test condition: the author-controlled JSON can hold a raw number
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.value = 1.5;
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx has a recipient that is not an address", () => {
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.to = "not-an-address" as Address;
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx has call data that is not hex", () => {
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.data = "not-hex";
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx has a negative value", () => {
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.value = "-1";
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx has a negative nonce", () => {
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.nonce = -1;
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx has a non-numeric operation", () => {
        // @ts-ignore Force test condition
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.operation = "banana";
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx has an operation outside the Safe range", () => {
        // @ts-ignore Force test condition
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.operation = "2";
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx value exceeds the uint256 range", () => {
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.value = (2n ** 256n).toString();
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safeSnap tx nonce exceeds the uint256 range", () => {
        // @ts-ignore Force test condition: the author-controlled JSON can hold an out-of-range nonce
        proposal.plugins.safeSnap.safes[0].txs[0].mainTransaction.nonce = (2n ** 256n).toString();
        expect(() => fn(event, proposal)).to.throw(MalformedSafeSnapTxError);
      });

      it("because a safe has a realityAddress that is not an address", () => {
        proposal.plugins.safeSnap.safes[0].realityAddress = "not-an-address" as Address;
        expect(() => fn(event, proposal)).to.throw(MalformedSafeError);
      });

      it("because a safe has a non-numeric network", () => {
        proposal.plugins.safeSnap.safes[0].network = "not-a-number";
        expect(() => fn(event, proposal)).to.throw(MalformedSafeError);
      });

      it("because a safe has no transactions array", () => {
        // @ts-ignore Force test condition
        proposal.plugins.safeSnap.safes[0].txs = undefined;
        expect(() => fn(event, proposal)).to.throw(MalformedSafeError);
      });

      it("because a safe entry is null", () => {
        // @ts-ignore Force test condition
        proposal.plugins.safeSnap.safes[0] = null;
        expect(() => fn(event, proposal)).to.throw(MalformedSafeError);
      });
    });
  });
});
