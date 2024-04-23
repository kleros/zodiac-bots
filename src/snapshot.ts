import { SnapshotSpace } from "./types";

const graphqlFetch = async (query: string) => {
  const response = await fetch("https://hub.snapshot.org/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
    }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
};

export const getSnapshotSpace = async (spaceId: string): Promise<SnapshotSpace> => {
  const response = await graphqlFetch(`query { 
    space(id: "${spaceId}") { 
        id
        name
        network
        plugins 
    }
}`);
  return await response.json().then((res: any) => res.data.space);
};

// TODO: use this in a separate bot for early notification before the transaction is proposed on Reality
export const getSnapshotActiveProposals = async (spaceId: string): Promise<any> => {
  const response = await graphqlFetch(`query {
    proposals (
        first: 20,
        skip: 0,
        where: {
            space_in: ["${spaceId}"],
            state: "active"
        },
        orderBy: "created",
        orderDirection: desc
    ) {
        id
        title
        choices
        start
        end
        snapshot
        state
        author
        plugins
    }
}`);
/*
Sample response:
[
      {
        "id": "0xf85353344a7c81528ce76aaf1dfb3c5dd642b247bb66ca64b86c1ec51de8cc56",
        "title": "[1IP-54] Recognized Delegates Program Renewal",
        "choices": [
          "Yes",
          "No",
          "Abstain"
        ],
        "start": 1711468474,
        "end": 1711900474,
        "snapshot": "19519320",
        "state": "active",
        "author": "0x5762F3074605df17AebE3f5BC8FC7f8702aca752",
        "plugins": {
          "safeSnap": {
            "safes": [
              {
                "txs": [
                  {
                    "hash": "0x6e90cfb05078e1a26fddefb74fd00f7018440815a9b37b8d0d76e495f966c02e",
                    "nonce": 0,
                    "transactions": [
                      {
                        "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        "data": "0xa9059cbb00000000000000000000000045e84e10e8e85c583c002a40007d10629ef80faf000000000000000000000000000000000000000000000000000000174876e800",
                        "type": "transferFunds",
                        "nonce": 0,
                        "token": {
                          "name": "USD Coin",
                          "symbol": "USDC",
                          "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                          "balance": "9585418.027511",
                          "chainId": 1,
                          "logoUri": "https://safe-transaction-assets.safe.global/tokens/logos/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png",
                          "decimals": 6,
                          "verified": true
                        },
                        "value": "0",
                        "amount": "100000000000",
                        "operation": "0",
                        "recipient": "0x45e84e10e8E85c583C002A40007D10629EF80fAF"
                      }
                    ],
                    "mainTransaction": {
                      "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                      "data": "0xa9059cbb00000000000000000000000045e84e10e8e85c583c002a40007d10629ef80faf000000000000000000000000000000000000000000000000000000174876e800",
                      "type": "transferFunds",
                      "nonce": "0",
                      "token": {
                        "name": "USD Coin",
                        "symbol": "USDC",
                        "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                        "balance": "9585418.027511",
                        "chainId": 1,
                        "logoUri": "https://safe-transaction-assets.safe.global/tokens/logos/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png",
                        "decimals": 6,
                        "verified": true
                      },
                      "value": "0",
                      "amount": "100000000000",
                      "operation": "0",
                      "recipient": "0x45e84e10e8E85c583C002A40007D10629EF80fAF"
                    }
                  }
                ],
                "hash": "0x43e50baee1686516a18a346094ef32cb6a3c8bdcea751f13db1d2b9c57d95670",
                "network": "1",
                "realityAddress": "0xa62D2a75eb39C12e908e9F6BF50f189641692F2E",
                "multiSendAddress": "0x8D29bE29923b68abfDD21e541b9374737B49cdAD"
              }
            ],
            "valid": true
          }
        }
      },
*/
  return await response.json().then((res: any) => res.data.proposals);
};
