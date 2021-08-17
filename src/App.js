import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { fetchPieces, getObjktInfo } from './data/api'
import { getIpfsUrl } from './utils/ipfs';
import { toTezValue } from './utils/numbers';
import { walletPreview } from './utils/string';
import { swap, connect, disconnect, getAccount } from './data/hen';
import ReactLoading from "react-loading";

const App = () => {
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(false)
  const [collection, setCollection] = useState([])
  const [toSwap, setToSwap] = useState({})
  const [error, setError] = useState(false)
  const [swaps, setSwaps] = useState(false)
  const [type, setType] = useState('mySecondaryMarketSales')
  const [fee, setFee] = useState(1)
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

  useEffect(() => {
    (async () => {
      setLoading(true)
      setToSwap({})
      if (account) {
        try {
          const pieces = await fetchPieces(account, type)
          setSwaps(pieces)
        } catch {
          setError('Could not fetch your collection')
        }
      }
      setLoading(false)
    })()
  }, [account, type])

  const fetchObjktPrice = async (id) => {
    return await getObjktInfo(id)
  }

  const batchSwap = useCallback(async () => {
    setLoading(`Swapping the OBJKTs`)
    try {
      await swap(toSwap, account, fee)
      const pieces = await fetchPieces(account, type)
      setSwaps(pieces)
      setToSwap({})
    } catch {
      setError('Swap failed')
    }
    setLoading(false)
  }, [toSwap, account, type, fee])

  const connectWallet = useCallback(() => {
    setLoading('Connecting')
    connect().then((account) => {
      setAccount(account)
    }).catch(() => {
      setError('Could not fetch wallet')
    }).finally(() => setLoading(false))
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
      setLoading('Fetching your collection')
      if (account) {
        try {
          const result = []
          for (let i in swaps) {
            const objkt = swaps[i]
            if (objkt.status === 0 || !objkt.status) {
              const objktInfo = await fetchObjktPrice(objkt.token.id)
              const currentSwaps = objktInfo.swaps.filter(objkt => objkt.status === 0)
              let lowestPricedObjkt = false
              if (currentSwaps.length) {
                lowestPricedObjkt = currentSwaps.reduce(function (prev, curr) {
                  return prev.price < curr.price ? prev : curr;
                });
              }
              result.push({
                ...objkt,
                meta: objktInfo,
                bidder: lowestPricedObjkt ? { link: `https://www.hicetnunc.xyz/tz/${lowestPricedObjkt.creator.address}`, name: lowestPricedObjkt.creator.name || walletPreview(lowestPricedObjkt.creator.address) } : false,
                minPrice: toTezValue(lowestPricedObjkt.price),
                price: toTezValue(objkt.price),
                initialPrice: toTezValue(objkt.price)
              })
            }
          }
          setCollection(result)
        } catch (err) {
          console.log(err)
          setCollection([])
        }
      } else {
        setCollection([])
        setToSwap({})
      }
      setLoading(false)
    })()
  }, [account, swaps])

  const getNewObjkts = useMemo(() => {
    let count = 0
    for (let i in toSwap) {
      const objkt = collection.find(o => o.token.id === toSwap[i].token.id)
      if (objkt.price) {
        if (toSwap[i].price !== String(objkt.price)) {
          count++
        } else {
          delete toSwap[i];
        }
      } else {
        if (toSwap[i].price) {
          count++
        } else {
          delete toSwap[i];
        }
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
    <main className="min-h-screen flex flex-col">
      {loading ?
        <section id="loading" className="w-full flex-1 h-full flex flex-col items-center justify-center">
          <ReactLoading type='balls' color="#111827" />
          <p className="text-base text-left font-medium">{loading}</p>
        </section>
        : <>
          <section id="controls" className="w-full flex flex-col items-center pt-6 pb-4">
            <div className="container">
              <div className="flex flex-row py-2 items-center">
                {
                  [
                    {
                      name: 'Swaps',
                      key: 'mySecondaryMarketSales'
                    },
                    {
                      name: 'Collection',
                      key: 'collectorGallery'
                    },
                  ].map((btn) => <button key={btn.key} onClick={() => setType(btn.key)} className={`text-base mr-4 bg-transparent text-center ${type === btn.key ? '' : 'text-gray-900 underline'} border-none `}>
                    {btn.name}
                  </button>)
                }
              </div>
            </div>
          </section>
          <section id="main" className="w-full flex flex-col items-center pb-16">
            <div className="container">
              <div className="flex flex-row justify-between py-2 items-center border-b-4 border-gray-300">
                <div className="flex flex-row items-center w-3/6">
                  <p className="text-base text-left font-medium">OBJKT</p>
                </div>
                <div className="w-1/6">
                  <p className="text-base text-left font-medium">Min. Price</p>
                </div>
                <div className="w-1/6">
                  <p className="text-base text-left font-medium">Your Price</p>
                </div>
                <div className="w-1/6">
                  <p className="text-base text-left font-medium">New Price</p>
                </div>
              </div>
            </div>
            <div className="container overflow-hidden">
              <div className='flex flex-row justify-between py-2 items-center border-b bg-blue-50 border-gray-200 bg-white'>
                <div className="flex flex-row items-center w-3/6">

                  <div className="flex flex-col items-start">
                    <p className="text-base text-black">Service Fee (min 0.01)</p>
                    <a target="_blank" rel="noreferrer" tabIndex="-1" className="text-base underline text-blue-500" href='https://twitter.com/superbialux'>Twitter: @superbialux</a>
                    <a target="_blank" rel="noreferrer" tabIndex="-1" className="text-base underline text-blue-500" href='https://www.hicetnunc.xyz/superbia'>HEN: superbia</a>
                  </div>
                </div>
                <div className="w-1/6">
                  <p className='text-base text-left'>0.01 tez</p>
                </div>
                <div className="w-1/6" >
                  <p className='text-base text-left'>{fee} tez</p>
                </div>
                <div className="w-1/6 flex flex-row items-center">
                  <input
                    onWheel={(e) => e.target.blur()}
                    className="border p-1 border-gray-300 w-2/3"
                    value={fee}
                    placeholder="price"
                    type="number"
                    onChange={(e) => setFee(e.target.value)}
                  />
                  <span className="w-1/3 text-center text-base">tez</span>
                </div>
              </div>
              {
                collection && collection.length ?
                  collection.map((piece, idx) => (
                    <div key={idx} className={`flex flex-row justify-between py-2 items-center border-b border-gray-200 ${toSwap[piece.token.id] ? 'bg-gray-100' : 'bg-white'}`}>
                      <div className="flex flex-row items-center w-3/6">
                        <img className="h-6 w-6 mr-3" src={getIpfsUrl(piece.token.display_uri)} alt={piece.token.id} />
                        <div className="flex flex-col items-start">
                          <a target="_blank" rel="noreferrer" tabIndex="-1" className="text-base underline text-blue-500" href={`https://www.hicetnunc.xyz/objkt/${piece.token.id}`}>{piece.token.title}</a>
                          <p className="text-base text-black">OBJKT #{piece.token.id}</p>
                        </div>
                      </div>
                      <div className="w-1/6">
                        {
                          piece.minPrice ? <div className="flex flex-col items-start">
                            <p className="text-base text-left">{piece.minPrice} tez</p>
                            <a target="_blank" rel="noreferrer" tabIndex="-1" className="text-xs text-blue underline text-blue-500" href={piece.bidder.link}>{piece.bidder.name}</a>
                          </div> : <p className='text-base text-left'>-</p>}
                      </div>
                      <div className="w-1/6">
                        {
                          piece.price
                            ? <p className={`text-base text-left ${parseFloat(piece.price) > parseFloat(piece.minPrice) ? 'text-red-500' : null}`}>{piece.price} tez</p>
                            : <p className='text-base text-left'>-</p>
                        }
                      </div>
                      <div className="w-1/6 flex flex-row items-center">
                        <input
                          onWheel={(e) => e.target.blur()}
                          className="border p-1 border-gray-300 w-2/3"
                          value={(toSwap[piece.token.id]?.price === undefined ? piece.price : toSwap[piece.token.id]?.price)}
                          placeholder="price"
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
              {account ? null : <div className="w-full py-12 flex flex-row justify-center">
                <button className="text-base bg-transparent text-gray-900 border-none underline" onClick={connectWallet}>Connect your wallet to start</button>
              </div>}
            </div>
          </section>
          <footer className="fixed bottom-0 bg-gray-900 w-full flex flex-row justify-center">
            <div className="container flex flex-row justify-between py-3">
              <div className="flex-1 flex flex-row justify-start">
                {account
                  ? <button className="text-base bg-transparent text-white border-none underline" onClick={disconnectWallet}>Disconnect</button>
                  : <button className="text-base bg-transparent text-white border-none underline" onClick={connectWallet}>Connect</button>
                }
              </div>

              {error ? <div className="flex-1 flex flex-row justify-center">
                <p className="text-base text-red-500">
                  Error: {error}
                </p>
              </div> : null}

              <div className="flex-1 flex flex-row justify-end">
                {account
                  ? <button disabled={!getNewObjkts || parseFloat(fee) === 0} className="text-base bg-transparent text-white border-none underline" onClick={batchSwap}>Swap {getNewObjkts} OBJKT{getNewObjkts === 1 ? '' : 's'}</button>
                  : null
                }
              </div>
            </div>
          </footer>
        </>
      }
    </main>
  );
}

export default App;
