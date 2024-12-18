type GraphQLFetchFn = <ResponseType>(url: string, query: string) => Promise<ResponseType>;
export const graphQLFetch: GraphQLFetchFn = async <ResponseType>(url: string, query: string): Promise<ResponseType> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
    }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} body: ${response.body}`);
  }
  const { data } = await response.json();
  return data as ResponseType;
};
