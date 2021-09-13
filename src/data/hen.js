import { TezosToolkit, OpKind } from "@taquito/taquito";
import { BeaconWallet } from "@taquito/beacon-wallet";
import {
  NetworkType,
} from "@airgap/beacon-sdk";

const Tezos = new TezosToolkit('https://api.tez.ie/rpc/mainnet')
const wallet = new BeaconWallet({ name: "OBJKTs Batch Swap" });

Tezos.setWalletProvider(wallet);
const network = { type: NetworkType.MAINNET };

export const getAccount = async () => {
  try {
    return await wallet.client.getActiveAccount()
  } catch (err) {
    throw err
  }
}


export const connect = async () => {
  try {
    await wallet.client.requestPermissions({
      network: network,
    })
    const address = await wallet.getPKH();
    return address
  } catch (err) {
    throw err
  }
}

export const disconnect = async () => {
  try {
    await wallet.clearActiveAccount();
    return 'disconnected'
  } catch (err) {
    throw err
  }
}


export const swap = async (pieces, ownerAddress, fee) => {
  console.log(pieces)
  try {
    const v2Contract = 'KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn'
    const objktsContract = 'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton'

    let objkts = await Tezos.wallet.at(objktsContract)
    let marketplace = await Tezos.wallet.at(v2Contract)

    let list = []
    for (let i in pieces) {
      const objkt = pieces[i]
      const price = objkt.price ? objkt.price : objkt.initialPrice
      const amount = objkt.holding ? objkt.holding : 1

      const currentSwap = objkt.meta.swaps?.find(s => s.creator.address === ownerAddress && s.status === 0)

      if (currentSwap) {
        list.push({
          kind: OpKind.TRANSACTION,
          ...marketplace.methods.cancel_swap(parseFloat(currentSwap.id)).toTransferParams({ amount: 0, mutez: true, storageLimit: 250 })
        })
      }
      list.push(
        {
          kind: OpKind.TRANSACTION,
          ...objkts.methods.update_operators([{ add_operator: { operator: v2Contract, token_id: parseFloat(objkt.meta.id), owner: ownerAddress } }])
            .toTransferParams({ amount: 0, mutez: true, storageLimit: 80 })
        }
      )
      list.push(
        {
          kind: OpKind.TRANSACTION,
          ...marketplace.methods.swap(objkt.meta.creator.address, parseFloat(amount), parseFloat(objkt.meta.id), parseFloat(objkt.meta.royalties), parseFloat(price * 1000000)).toTransferParams({ amount: 0, mutez: true, storageLimit: 220 })
        }
      )
    }

    if (fee !== 0) {
      list.push(
        {
          kind: OpKind.TRANSACTION,
          to: 'tz1MGXFh1CgiFL5p3dhLWiAabe9tkjjfrEdF',
          amount: fee,
        }
      )
    }

    let batch = await Tezos.wallet.batch(list)
    const batchOp = await batch.send()
    return await batchOp.confirmation()
  } catch (err) {
    console.log(err)
    throw err
  }
}
