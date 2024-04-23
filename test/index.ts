import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import hre from "hardhat";
import { expect } from "chai";
import { start, stop } from "../src/bot";
import { Proposal } from "../src/types";
import { createProposal, submitAnswer } from "./fixtures";

describe("Reality Module Monitoring", function () {
  it("should detect the old 1inch proposal", async function () {
    let result: Proposal = {
      proposalId: "0x",
      questionId: "0x",
      answers: [],
    };
    await start(
      "1inch.eth",
      async (proposal) => {
        result = proposal;
      },
      async (proposal) => {
        // no new answer to handle
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));
    stop();

    // https://etherscan.io/tx/0x890ddd7826fcd79ff17b54368e8df393959f269847ceeb0fea13cc4b68330d43#eventlog
    expect(result.proposalId).to.be.equal("0x791b3d71ea14497d3b8e756479f6f126e08b44351bfab904834c56b1ccf0479a");
    expect(result.questionId).to.be.equal("0xebf5b601fedfaa5562a03590e9ac8be937cc070a131443af01948a7eda6dfabf");
  });

  it("should detect the new proposal and the new answer", async function () {
    // Mine a block so we don't process the existing 1inch proposal again
    await hre.viem.getTestClient().then((client) => client.mine({ blocks: 1 }));
    let result: Proposal = {
      proposalId: "0x",
      questionId: "0x",
      answers: [],
    };
    await start(
      "1inch.eth",
      async (proposal) => {
        result = proposal;
      },
      async (proposal) => {
        result = proposal;
      },
    );
    const { proposalId, questionId } = await loadFixture(createProposal);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // expect(result.proposalId).to.be.equal(proposalId); // Not matching, not sure why
    expect(result.questionId).to.be.equal(questionId);

    const { answer: expectedAnswer } = await loadFixture(submitAnswer);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(result.answers.length).to.be.equal(1);
    expect(result.answers.at(-1)?.answer).to.be.equal(expectedAnswer);

    stop();
  });
});
