import { TezosToolkit, OpKind } from "@taquito/taquito";
import { BeaconWallet } from "@taquito/beacon-wallet";

const Tezos = new TezosToolkit("https://mainnet-tezos.giganode.io");
const wallet = new BeaconWallet({ name: "OBJKTs Batch Swap" });

Tezos.setWalletProvider(wallet);
export const swap = async (pieces, ownerAddress) => {
  if (pieces && pieces.length && ownerAddress) {

    const v2Contract = 'KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn'
    const objktsContract = 'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton'

    let objkts = await Tezos.wallet.at(objktsContract)
    let marketplace = await Tezos.wallet.at(v2Contract)

    let list = []
    for (let i in pieces) {
      const objkt = pieces[i]
      const price = objkt.price ? objkt.price : 0
      console.log(price)
      const { id: swapId } = objkt.meta.swaps.find(s => s.creator.address === ownerAddress && s.status === 0)
      list.push({
        kind: OpKind.TRANSACTION,
        ...marketplace.methods.cancel_swap(parseFloat(swapId)).toTransferParams({ amount: 0, mutez: true, storageLimit: 250 })
      })
      // swap with new price
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
          ...marketplace.methods.swap(objkt.meta.creator.address, parseFloat(1), parseFloat(objkt.meta.id), parseFloat(objkt.meta.royalties), parseFloat(price * 1000000)).toTransferParams({ amount: 0, mutez: true, storageLimit: 220 })
        }
      )
    }

    let batch = await Tezos.wallet.batch(list);
    return await batch.send()
  } else {
    throw ''
  }
}
