import axios from 'axios'

const keys = {
  collectorGallery: 'hic_et_nunc_token_holder',
  mySecondaryMarketSales: 'hic_et_nunc_swap'
}

export const fetchPieces = async (address, queryType) => {
  const query = `
  query collectorGallery($address: String!) {
    hic_et_nunc_token_holder(where: {holder_id: {_eq: $address}, quantity: {_gt: "0"}, token: {supply: {_gt: "0"}}}, order_by: {id: desc}) {
      token {
        id
        artifact_uri
        display_uri
        thumbnail_uri
        timestamp
        mime
        title
        description
        supply
        token_tags {
          tag {
            tag
          }
        }
        creator {
          address
        }
        swaps(where: {status: {_eq: "0"}}, order_by: {price: asc}) {
          amount
          amount_left
          creator_id
          price
        }
      }
    }
  }
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

  const { data } = await fetchGraphQL(query, queryType, { "address": address });
  const swaps = await data.data[keys[queryType]]
  return swaps
}

export const getObjktInfo = async (objkt_id) => {
  const query = `
  query Objkt($id: bigint!) {
    hic_et_nunc_token_by_pk(id: $id) {
      artifact_uri
      creator {
        address
        name
      }
      description
      display_uri
      id
      level
      mime
      royalties
      supply
      thumbnail_uri
      metadata
      timestamp
      title
      token_tags(order_by: {id: asc}) {
        tag {
          tag
        }
      }
      swaps(order_by: {id: asc}) {
        price
        timestamp
        status
        id
        amount
        amount_left
        creator {
          address
          name
        }
      }
      trades(order_by: {timestamp: asc}) {
        amount
        buyer {
          address
          name
        }
        seller {
          address
          name
        }
        swap {
          price
        }
        timestamp
      }
      token_holders(where: {quantity: {_gt: "0"}}, order_by: {id: asc}) {
        quantity
        holder {
          address
          name
        }
      }
      hdao_balance
      extra
    }
  }
`;

  async function fetchGraphQL(operationsDoc, operationName, variables) {    
    const result = await fetch(
      "https://api.hicdex.com/v1/graphql",
      {
        method: "POST",
        body: JSON.stringify({
          query: operationsDoc,
          variables: variables,
          operationName: operationName
        })
      }
    );

    return await result.json();
  }


  const { data } = await fetchGraphQL(query, "Objkt", { "id": objkt_id });
  const result = data.hic_et_nunc_token_by_pk
  return result

}
