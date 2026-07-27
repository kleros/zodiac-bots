import { ValidProposalNotification } from "../notify";
import { env } from "./env";
import { getBlockExplorerLinkForTx, getRealityQuestionLink, interpolateUrlTemplate } from "./links";
import { expect } from "./tests-setup";

describe("interpolateUrlTemplate", () => {
  it("should substitute the requested fields", () => {
    const template = "http://foo.com/{{value1}}?search={{value2}}";
    const result = interpolateUrlTemplate(template, {
      value1: "a",
      value2: "b",
    });
    expect(result).to.eql("http://foo.com/a?search=b");
  });
});

describe("getRealityQuestionLink", () => {
  it("should generate a link using the oracle address and questionId", () => {
    const oracleAddress = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const questionId = "123";
    const notification = {
      space: {
        oracleAddress,
      },
      event: {
        questionId,
      },
    } as any as ValidProposalNotification;
    const template = "http://test.com/network/{{chainId}}/{{oracleAddress}}/questions/{{questionId}}";
    const result = getRealityQuestionLink(notification, template);
    expect(result).to.eql(
      `http://test.com/network/${env.CHAIN_ID}/${oracleAddress.toLowerCase()}/questions/${questionId.toLowerCase()}`,
    );
  });

  it("should use an explicit chainId when given, instead of the default", () => {
    const oracleAddress = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const questionId = "123";
    const notification = {
      space: {
        oracleAddress,
      },
      event: {
        questionId,
      },
    } as any as ValidProposalNotification;
    const template = "http://test.com/network/{{chainId}}/{{oracleAddress}}/questions/{{questionId}}";
    const explicitChainId = "100";
    const result = getRealityQuestionLink(notification, template, explicitChainId);
    expect(result).to.eql(
      `http://test.com/network/${explicitChainId}/${oracleAddress.toLowerCase()}/questions/${questionId.toLowerCase()}`,
    );
  });
});

describe("getBlockExplorerLinkForTx", () => {
  it("should generate a link using the txHash", () => {
    const txHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const template = "http://test.com/tx/{{txHash}}";
    const result = getBlockExplorerLinkForTx(txHash, template);
    expect(result).to.eql(`http://test.com/tx/${txHash}`);
  });
});