import React, { useEffect, useState, useMemo } from 'react'
import './App.css';
import { TezosToolkit} from "@taquito/taquito";
import { BeaconWallet } from "@taquito/beacon-wallet";
import {
  NetworkType,
} from "@airgap/beacon-sdk";
import { fetchPieces, getObjktInfo } from './data/api'
import { getIpfsUrl } from './utils/ipfs';
import { toTezValue } from './utils/numbers';
import { swap } from './data/hen';

const Tezos = new TezosToolkit("https://mainnet-tezos.giganode.io");
const wallet = new BeaconWallet({ name: "OBJKTs Batch Swap" });

Tezos.setWalletProvider(wallet);
const network = { type: NetworkType.MAINNET };

const App = () => {
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(false)
  const [collection, setCollection] = useState([])
  const [toSwap, setToSwap] = useState({})
  const [error, setError] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const activeAccount = await wallet.client.getActiveAccount()
        if (activeAccount) {
          setAccount(activeAccount.address)
        }
        setLoading(false)
      } catch (err) {
        console.log(err)
        setLoading(false)
      }
    })()
  }, [])


  const connect = async () => {
    try {
      console.log("Requesting permissions...")
      const permissions = await wallet.client.requestPermissions({
        network: network,
      })
      const address = await wallet.getPKH();
      setAccount(address)
      setLoading(false)
      console.log("Got permissions:", permissions.address)
    } catch (error) {
      console.log("Got error:", error)
    }
  }

  const disconnect = async () => {
    try {
      await wallet.clearActiveAccount();
      setAccount(false)
    } catch (err) {
      console.log('Got error:', err)
    }
  }

  const fetchObjktPrice = async (id) => {
    return await getObjktInfo(id)
  }

  useEffect(() => {
    (async () => {
      setLoading(true)
      if (account) {
        try {
          const swaps = await fetchPieces(account)
          const result = []
          for (let i in swaps) {
            const objkt = swaps[i]
            if (objkt.status === 0) {
              const objktInfo = await fetchObjktPrice(objkt.token.id)
              const currentSwaps = objktInfo.swaps.filter(objkt => objkt.status === 0)
              const lowestPricedObjkt = currentSwaps.reduce(function (prev, curr) {
                return prev.price < curr.price ? prev : curr;
              });
              result.push({
                ...objkt,
                meta: objktInfo,
                minPrice: toTezValue(lowestPricedObjkt.price),
                price: toTezValue(objkt.price)
              })
            }
          }
          setCollection(result)
          setLoading(false)
        } catch (err) {
          setLoading(false)
          setCollection(false)
        }
      }
    })()
  }, [account])

  const getNewObjkts = useMemo(() => {
    let count = 0
    for (let i in toSwap) {
      const objkt = collection.find(o => o.token.id === toSwap[i].token.id)
      if (toSwap[i].price !== String(objkt.price)) {
        count++
      }
    }
    return count
  }, [collection, toSwap])

  useEffect(() => {
    let errorTimer = setTimeout(() => setError(false), 5000);

    // this will clear Timeout
    // when component unmount like in willComponentUnmount
    // and show will not change to true
    return () => {
      clearTimeout(errorTimer);
    };
  }, [error])


  return (
    <div className="App">
      <section className="w-full flex flex-col items-center pt-6 pb-16">
        <div className="container">
          <div className="flex flex-row justify-between py-2 items-center border-b-4 border-gray-300">
            <div className="flex flex-row items-center w-3/6">
              <p className="text-left font-medium">OBJKT</p>
            </div>
            <div className="w-1/6">
              <p className="text-left font-medium">min price</p>
            </div>
            <div className="w-1/6">
              <p className="text-left font-medium">your price</p>
            </div>
            <div className="w-1/6">
              <p className="text-left font-medium">new price</p>
            </div>
          </div>
        </div>
        <div className="container overflow-hidden">
          {
            collection && collection.length ?
              collection.map((piece, idx) => (
                <div key={idx} className="flex flex-row justify-between py-2 items-center border-b border-gray-200">
                  <div className="flex flex-row items-center w-3/6">
                    <img className="h-6 w-6 mr-3" src={getIpfsUrl(piece.token.display_uri)} alt={piece.token.id} />
                    <div className="flex flex-col items-start">
                      <a className="text-blue underline text-blue-500" href={`https://www.hicetnunc.xyz/objkt/${piece.token.id}`}>{piece.token.title}</a>
                      <p>OBJKT #{piece.token.id}</p>
                    </div>
                  </div>
                  <div className="w-1/6">
                    <p className="text-left">{piece.minPrice} tez</p>
                  </div>
                  <div className="w-1/6">
                    <p className={`text-left ${parseFloat(piece.price) > parseFloat(piece.minPrice) ? 'text-red-500' : null}`}>{piece.price} tez</p>
                  </div>
                  <div className="w-1/6 flex flex-row items-center">
                    <input
                      className="border p-1 border-gray-300 w-full w-2/3"
                      value={toSwap[piece.token.id]?.price === undefined ? piece.price : toSwap[piece.token.id]?.price}
                      placeholder="price per OBJKT"
                      type="number"
                      onChange={(e) => {
                        setToSwap({
                          ...toSwap,
                          [piece.token.id]: {
                            ...piece,
                            price: e.target.value
                          }
                        })
                      }}
                    />
                    <span className="w-1/3">tez</span>
                  </div>
                </div>
              )) : null
          }
        </div>
      </section>
      <footer className="fixed bottom-0 bg-gray-900 w-full flex flex-row justify-center">
        <div className="container flex flex-row justify-between py-3">
          <div>
            {loading
              ? <p className="text-white">loading...</p>
              : account
                ? <button className="bg-transparent text-white border-none underline" onClick={disconnect}>disconnect</button>
                : <button className="bg-transparent text-white border-none underline" onClick={connect}>connect</button>
            }
          </div>
          
          {error ? <div className="flex-1">
            <p className="text-red-500">
              Error: {error}
            </p>
          </div> : null }
          <div>
            {loading
              ? null
              : account
                ? <button className="bg-transparent text-white border-none underline" onClick={async () => {
                  try {
                    await swap(toSwap, account)
                  } catch {
                    setError('could not open wallet')
                  }
                }}>reswap {getNewObjkts} objkts</button>
                : null
            }
          </div>
        </div>
      </footer>
    </div >
  );
}

export default App;
