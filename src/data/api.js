import axios from 'axios'

const keys = {
  collectorGallery: 'hic_et_nunc_token_holder',
  mySecondaryMarketSales: 'hic_et_nunc_swap'
}

export const fetchPieces = async (address, queryType) => {
  const query = `
  query fetchGallery($address: String!) {
    hic_et_nunc_token_holder(where: {holder_id: {_eq: $address}, quantity: {_gt: "0"}, token: {supply: {_gt: "0"}}}, order_by: {id: desc}) {
      token {
        supply
        title
        royalties
        id
        display_uri
        token_holders(where: {quantity: {_gt: "0"}}) {
          holder_id
          quantity
          holder {
            name
          }
        }
        creator {
          address
          name
        }
        swaps(where: {status: {_eq: "0"}}, order_by: {price: asc}) {
          amount_left
          price
          status
          id
          creator {
            address
            name
          }
        }
      }
    }
    hic_et_nunc_swap(
      where: {
        token: {creator: {address: {_neq: $address}}},
        status: {_in: [0]},
        creator: {address: {_eq: $address}}
      },
      order_by: {token_id: desc}
    ) {
      price
      status
      token {
        supply
        title
        royalties
        id
        display_uri
        token_holders(where: {quantity: {_gt: "0"}}) {
          holder_id
          quantity
          holder {
            name
          }
        }
        creator {
          address
          name
        }
        swaps(where: {status: {_eq: "0"}}, order_by: {price: asc}) {
          amount_left
          price
          status
          id
          creator {
            address
            name
          }
        }
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

  const { data } = await fetchGraphQL(query, 'fetchGallery', { "address": address });
  const swaps = await data.data[keys[queryType]]
  return swaps
}

