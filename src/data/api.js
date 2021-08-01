import axios from 'axios'

const query = `
  query mySecondaryMarketSales($address: String!) {
    hic_et_nunc_swap(
      where: {
        token: {creator: {address: {_neq: $address}}},
        status: {_in: [0, 1, 2]},
        creator: {address: {_eq: $address}}
      },
      order_by: {token_id: desc}
    ) {
      price
      status
      token {
        title
        mime
        description
        id
        artifact_uri
        display_uri
      }
    }
  }
`;

const fetchGraphQL = async (operationsDoc, operationName, variables) => {
  const result = await axios.post(
    "https://api.hicdex.com/v1/graphql",
    JSON.stringify({
      query: operationsDoc,
      variables: variables,
      operationName: operationName
    })
  );

  return await result
}

export const fetchPieces = async (address) => {
  const {data} = await fetchGraphQL(query, "mySecondaryMarketSales", { "address": address });
  const swaps = await data.data.hic_et_nunc_swap
  return swaps
}