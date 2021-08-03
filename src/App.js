import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { fetchPieces, getObjktInfo } from './data/api'
import { getIpfsUrl } from './utils/ipfs';
import { toTezValue } from './utils/numbers';
import { walletPreview } from './utils/string';
import { swap, connect, disconnect, getAccount } from './data/hen';

const App = () => {
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(false)
  const [collection, setCollection] = useState([])
  const [toSwap, setToSwap] = useState({})
  const [error, setError] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const activeAccount = await getAccount()
        if (activeAccount) {
          setAccount(activeAccount.address)
        }
        setLoading(false)
      } catch (err) {
        setLoading(false)
      }
    })()
  }, [])

  const fetchObjktPrice = async (id) => {
    return await getObjktInfo(id)
  }

  const batchSwap = useCallback(() => {
    swap(toSwap, account).then(() => {
      setToSwap({})
    }).catch(() => {
      setError('could not open wallet')
    })
  }, [toSwap, account])

  const connectWallet = useCallback(() => {
    connect().then((account) => {
      setAccount(account)
      setLoading(false)
    }).catch(() => {
      setError('Could not fetch wallet')
      setLoading(false)
    })
  }, [])


  const disconnectWallet = useCallback(() => {
    disconnect().then(() => {
      setAccount(false)
    }).catch(() => {
      setError('Could not disconnect wallet')
    })
  }, [])

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
                bidder: { link: `https://www.hicetnunc.xyz/tz/${lowestPricedObjkt.creator.address}`, name: lowestPricedObjkt.creator.name || walletPreview(lowestPricedObjkt.creator.address) },
                minPrice: toTezValue(lowestPricedObjkt.price),
                price: toTezValue(objkt.price),
                initialPrice: toTezValue(objkt.price)
              })
            }
          }
          setCollection(result)
          setLoading(false)
        } catch (err) {
          setLoading(false)
          setCollection(false)
        }
      } else {
        setLoading(false)
        setCollection([])
        setToSwap({})
      }
    })()
  }, [account])

  const getNewObjkts = useMemo(() => {
    let count = 0
    for (let i in toSwap) {
      const objkt = collection.find(o => o.token.id === toSwap[i].token.id)
      if (toSwap[i].price !== String(objkt.price)) {
        count++
      } else {
        delete toSwap[i];
      }
    }
    return count
  }, [collection, toSwap])

  useEffect(() => {
    let errorTimer = setTimeout(() => setError(false), 5000);
    return () => {
      clearTimeout(errorTimer);
    };
  }, [error])


  return (
    <main>
      <section className="w-full flex flex-col items-center pt-6 pb-16">
        <div className="container">
          <div className="flex flex-row justify-between py-2 items-center border-b-4 border-gray-300">
            <div className="flex flex-row items-center w-3/6">
              <p className="text-base text-left font-medium">OBJKT</p>
            </div>
            <div className="w-1/6">
              <p className="text-base text-left font-medium">min price</p>
            </div>
            <div className="w-1/6">
              <p className="text-base text-left font-medium">your price</p>
            </div>
            <div className="w-1/6">
              <p className="text-base text-left font-medium">new price</p>
            </div>
          </div>
        </div>
        <div className="container overflow-hidden">
          {
            collection && collection.length ?
              collection.map((piece, idx) => (
                <div key={idx} className={`flex flex-row justify-between py-2 items-center border-b border-gray-200 ${toSwap[piece.token.id] ? 'bg-gray-100' : 'bg-white'}`}>
                  <div className="flex flex-row items-center w-3/6">
                    <img className="h-6 w-6 mr-3" src={getIpfsUrl(piece.token.display_uri)} alt={piece.token.id} />
                    <div className="flex flex-col items-start">
                      <a tabIndex="-1" className="text-base underline text-blue-500" href={`https://www.hicetnunc.xyz/objkt/${piece.token.id}`}>{piece.token.title}</a>
                      <p className="text-base text-black">OBJKT #{piece.token.id}</p>
                    </div>
                  </div>
                  <div className="w-1/6">
                    <div className="flex flex-col items-start">
                      <p className="text-base text-left">{piece.minPrice} tez</p>
                      <a tabIndex="-1" className="text-xs text-blue underline text-blue-500" href={piece.bidder.link}>{piece.bidder.name}</a>
                    </div>
                  </div>
                  <div className="w-1/6">
                    <p className={`text-base text-left ${parseFloat(piece.price) > parseFloat(piece.minPrice) ? 'text-red-500' : null}`}>{piece.price} tez</p>
                  </div>
                  <div className="w-1/6 flex flex-row items-center">
                    <input
                      onWheel={(e) => e.target.blur()}
                      className="border p-1 border-gray-300 w-2/3"
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
                    <span className="w-1/3 text-center text-base">tez</span>
                  </div>
                </div>
              )) : null
          }
        </div>
      </section>
      <footer className="fixed bottom-0 bg-gray-900 w-full flex flex-row justify-center">
        <div className="container flex flex-row justify-between py-3">
          <div className="flex-1 flex flex-row justify-start">
            {loading
              ? <p className="text-base text-white">loading...</p>
              : account
                ? <button className="text-base bg-transparent text-white border-none underline" onClick={disconnectWallet}>disconnect</button>
                : <button className="text-base bg-transparent text-white border-none underline" onClick={connectWallet}>connect</button>
            }
          </div>

          {error ? <div className="flex-1 flex flex-row justify-center">
            <p className="text-base text-red-500">
              Error: {error}
            </p>
          </div> : null}
          <div className="flex-1 flex flex-row justify-end">
            {loading
              ? null
              : account
                ? <button className="text-base bg-transparent text-white border-none underline" onClick={batchSwap}>reswap {getNewObjkts} OBJKT{getNewObjkts === 1 ? '' : 's'}</button>
                : null
            }
          </div>
        </div>
      </footer>
    </main>
  );
}

export default App;
