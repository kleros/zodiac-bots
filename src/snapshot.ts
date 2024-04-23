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
  return await response.json().then((res: any) => res.data.space);
};
