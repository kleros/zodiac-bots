import http from "node:http";
import { AddressInfo } from "node:net";
import { graphQLFetch } from "./fetch-graphql";
import { expect } from "./tests-setup";

type OnQueryCallback = (query: string) => void;

const createFakeServer = (response: object, onQuery: OnQueryCallback) =>
  http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/graphql") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString(); // Convert Buffer to string
    });

    req.on("end", () => {
      const { query } = JSON.parse(body);
      onQuery(query);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: response }));
    });
  });

describe("graphQLFetch", () => {
  const fn = graphQLFetch;

  it("should successfully make a request and return the data", async () => {
    const query = `
      {
        hello
      }
    `;
    const expectedResponse = { num: 42 };
    const server = createFakeServer(expectedResponse, (receivedQuery) => {
      expect(receivedQuery).to.eqls(query);
    });

    await new Promise((resolve) => server.listen(0, () => resolve(null)));

    const { port } = server.address() as AddressInfo;
    const response = await fn(`http://localhost:${port}/graphql`, query);
    expect(response).to.eql(expectedResponse);

    server.close();
  });
});
