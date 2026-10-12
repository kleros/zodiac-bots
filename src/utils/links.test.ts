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
  it("should build a link the reality.eth frontend can open", () => {
    // Pinned because a broken link only shows up when a reviewer clicks one during an
    // incident. The chain segment is load-bearing: without it the app resolves the question
    // against whatever chain the viewer's wallet is on, so an L2 viewer cannot open it.
    const notification = {
      space: { oracleAddress: "0x5b7dD1E86623548AF054A4985F7fc8Ccbb554E2c" },
      event: { questionId: "0xBD1D378BCC3A11DC57C10BE3DAB9634D41D9D2BCCA24D6985A992CD2DDDDC7FC" },
    } as any as ValidProposalNotification;

    expect(getRealityQuestionLink(notification)).to.eql(
      "https://reality.gwei.site/#!/network/1/question/" +
        "0x5b7dd1e86623548af054a4985f7fc8ccbb554e2c-" +
        "0xbd1d378bcc3a11dc57c10be3dab9634d41d9d2bcca24d6985a992cd2ddddc7fc",
    );
  });

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
