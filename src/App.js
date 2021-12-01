import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { fetchPieces } from './data/api'
import { getIpfsUrl } from './utils/ipfs';
import { toTezValue } from './utils/numbers';
import { walletPreview } from './utils/string';
import { swap, connect, disconnect, getAccount } from './data/hen';
import ReactLoading from "react-loading";
import { AiFillCaretDown } from "react-icons/ai";

const coolKids = [
  'tz1MGXFh1CgiFL5p3dhLWiAabe9tkjjfrEdF',
  'tz1Rm5QmNUnQetDKSVW8srM29hjPRiQCgqJx'
]
const sortByPrice = (a, b) => {
  return Number(a.price) - Number(b.price)
}

const App = () => {
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(false)
  const [collection, setCollection] = useState([])
  const [toSwap, setToSwap] = useState({})
  const [error, setError] = useState(false)
  const [swaps, setSwaps] = useState(false)
  const [type, setType] = useState('mySecondaryMarketSales')
  const [fee, setFee] = useState(1)
  const [isCool, setIsCool] = useState(false)
  const [listings, setListings] = useState({})

  useEffect(() => {
    if (account && coolKids.includes(account)) {
      setFee(0)
      setIsCool(true)
    }
  }, [account])

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
      if (account) {
        if (swaps && swaps.length) {
          setLoading('Fetching your collection')
          try {
            const result = []
            for (let i in swaps) {
              const objkt = swaps[i]

              const objktInfo = objkt.token
              const currentSwaps = objktInfo.swaps
              let lowestPricedObjkt = false
              if (currentSwaps.length) {
                lowestPricedObjkt = currentSwaps.reduce(function (prev, curr) {
                  return prev.price < curr.price ? prev : curr;
                });
              }

              let total = 0
              total = objktInfo.supply
              let ed =
                objktInfo.token_holders.filter(
                  (e) => e.holder_id === 'KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn'
                ).length > 0
                  ? objktInfo.token_holders.filter(
                    (e) => e.holder_id === 'KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn'
                  )[0].quantity
                  : 'X'
              result.push({
                ...objkt,
                meta: objktInfo,
                creator: { link: `https://www.hicetnunc.art/tz/${objktInfo.creator.address}`, name: objktInfo.creator.name || walletPreview(objktInfo.creator.address) },
                bidder: lowestPricedObjkt ? { link: `https://www.hicetnunc.art/tz/${lowestPricedObjkt.creator.address}`, name: lowestPricedObjkt.creator.name || walletPreview(lowestPricedObjkt.creator.address) } : false,
                minPrice: toTezValue(lowestPricedObjkt.price),
                price: toTezValue(objkt.price),
                initialPrice: toTezValue(objkt.price || objkt.minPrice),
                editions: `${ed}/${total}`
              })

            }
            setCollection(result)
          } catch (err) {
            console.log(err)
            setCollection([])
          }
          setLoading(false)
        }
      } else {
        setCollection([])
        setToSwap({})
      }
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

  const getNewValue = useCallback((piece) => {
    if (toSwap[piece.token.id]?.price === undefined) {
      if (piece.price) {
        return piece.price
      }
      return ''
    }
    return toSwap[piece.token.id]?.price
  }, [toSwap])

  return (
    <main className="min-h-screen flex flex-col">
      {loading ?
        <section id="loading" className="w-full flex-1 h-full flex flex-col items-center justify-center">
          <ReactLoading type='balls' color="#111827" />
          <p className="text-base text-left font-medium">{loading}</p>
        </section>
        : <>
          <section id="controls" className="w-full flex flex-col items-center pt-6 pb-4 px-4">
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
          <section id="main" className="w-full flex flex-col items-center pb-16 px-4">
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
              {isCool ? null : <div className='flex flex-row justify-between py-2 items-center border-b bg-blue-50 border-gray-200 bg-white'>
                <div className="flex flex-row items-center w-3/6">

                  <div className="flex flex-col items-start">
                    <p className="text-base text-black">Service Fee (min 0.01)</p>
                    <a target="_blank" rel="noreferrer" tabIndex="-1" className="text-base underline text-blue-500" href='https://twitter.com/superbialux'>Twitter: @superbialux</a>
                    <a target="_blank" rel="noreferrer" tabIndex="-1" className="text-base underline text-blue-500" href='https://www.hicetnunc.art/superbia'>HEN: superbia</a>
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
                    placeholder="fee"
                    type="number"
                    onChange={(e) => setFee(e.target.value)}
                  />
                  <span className="w-1/3 text-center text-base">tez</span>
                </div>
              </div>}
              {
                collection && collection.length ?
                  collection.map((piece, idx) => (
                    <div key={idx} className={`flex flex-row justify-between py-2 border-b border-gray-200 ${toSwap[piece.token.id] ? 'bg-gray-100' : 'bg-white'}`}>
                      <div className="flex flex-row items-center w-3/6 overflow-hidden">
                        <img className="h-6 w-6 mr-3" src={getIpfsUrl(piece.token.display_uri)} alt={piece.token.id} />
                        <div className="flex flex-col items-start">

                          <a target="_blank" rel="noreferrer" tabIndex="-1" className="text-base underline text-blue-500" href={`https://www.hicetnunc.art/objkt/${piece.token.id}`}>
                            {piece.token.title || '#' + piece.token.id}
                          </a>

                          <div className="flex flex-row items-center">
                            <p className="text-sm text-black">
                              by <a target="_blank" rel="noreferrer" tabIndex="-1" className="text-base text-blue underline text-blue-500" href={piece.creator.link}>{piece.creator.name}</a>
                            </p>
                            <div className="bg-gray-300 w-1 h-1 mx-2" />
                            <p className="text-sm text-black">Editions: {piece.editions} </p>
                            <div className="bg-gray-300 w-1 h-1 mx-2" />
                            <p className="text-sm text-black">#{piece.token.id}</p>
                            <div className="bg-gray-300 w-1 h-1 mx-2" /> 
                            <p className="text-sm text-black">{piece.token.royalties/10}%</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-1/6 overflow-hidden">
                        <div>
                          {
                            piece.minPrice || piece.price === 0 ? <div className="flex flex-row items-center">
                              <p className="text-base text-left">{piece.minPrice} tez</p>
                              <a target="_blank" rel="noreferrer" tabIndex="-1" className="text-sm text-blue underline text-blue-500 ml-2" href={piece.bidder.link}>{piece.bidder.name}</a>
                            </div> : <p className='text-base text-left'>-</p>}
                        </div>
                        <div>
                          <button tabIndex="-1" onClick={() => setListings({ ...listings, [piece.token.id]: !listings[piece.token.id] })} className="text-sm flex flex-row items-center underline text-gray-900">Show Listings <AiFillCaretDown className="ml-1" /></button>
                          {listings[piece.token.id] ? <div className="text-xs mt-1">
                            {piece.meta.swaps.sort(sortByPrice).map((swap, index) => (
                              <div key={index} >
                                <div className="items-center">
                                  {swap.amount_left} ed. <a target="_blank" rel="noreferrer" tabIndex="-1" className="text-sm text-blue underline text-blue-500" href={`https://www.hicetnunc.art/tz/${swap.creator.address}`}>
                                    {swap.creator.name || walletPreview(swap.creator.address)}</a> {toTezValue(swap.price)} tez
                                </div>
                              </div>
                            ))}
                          </div> : null}
                        </div>
                      </div>
                      <div className="w-1/6 flex flex-col justify-center overflow-hidden">
                        {
                          piece.price || piece.price === 0
                            ? <p className={`text-base text-left ${parseFloat(piece.price) > parseFloat(piece.minPrice) ? 'text-red-500' : null}`}>{piece.price} tez</p>
                            : <p className='text-base text-left'>-</p>
                        }
                      </div>
                      <div className="w-1/6 flex flex-row items-center justify-center">
                        <input
                          onWheel={(e) => e.target.blur()}
                          className="border p-1 border-gray-300 w-2/3"
                          value={getNewValue(piece)}
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
          <footer className="fixed bottom-0 bg-gray-900 w-full flex flex-row justify-center px-4">
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
                  ? <button disabled={!getNewObjkts || (parseFloat(fee) === 0 && !isCool)} className="text-base bg-transparent text-white border-none underline" onClick={batchSwap}>Swap {getNewObjkts} OBJKT{getNewObjkts === 1 ? '' : 's'}</button>
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
