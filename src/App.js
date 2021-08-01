import React, { useEffect, useState } from 'react'
import './App.css';
import { TezosToolkit } from "@taquito/taquito";
import { BeaconWallet } from "@taquito/beacon-wallet";
import {
  NetworkType,
} from "@airgap/beacon-sdk";
import { fetchPieces } from './data/api'
import { getIpfsUrl } from './utils/ipfs';
const Tezos = new TezosToolkit("https://mainnet-tezos.giganode.io");
const wallet = new BeaconWallet({ name: "Beacon Docs Taquito" });

Tezos.setWalletProvider(wallet);
const network = { type: NetworkType.MAINNET };

const TZ_OBJKTS = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton";

const App = () => {
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState(false)
  const [collection, setCollection] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const activeAccount = await wallet.client.getActiveAccount()
        if (activeAccount) {
          // If defined, the user is connected to a wallet.
          // You can now do an operation request, sign request, or send another permission request to switch wallet
          console.log("Already connected:", activeAccount.address)
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

  useEffect(() => {
    (async () => {
      setLoading(true)
      if (account) {
        try {
          const swaps = await fetchPieces(account)
          console.log(swaps)
          setCollection(swaps)
        } catch (err) {
          console.log(err)
        }
      }
    })()
  }, [account])

  return (
    <div className="App">
      <header className="App-header">
        {loading
          ? 'loading...'
          : account
            ? <button onClick={disconnect}>disconnect</button>
            : <button onClick={connect}>connect</button>
        }
        {
          collection && collection.length ? 
          collection.map((piece) => (
            <div>
              <p>{piece.token.price}</p>
              <p>{piece.token.title}</p>
              <img style={styles.img} src={getIpfsUrl(piece.token.display_uri)} alt={piece.token.id} />
            </div>
          )) : null 
        }
      </header>
    </div>
  );
}

const styles = {
  img: {
    width: 200,
    height: 200
  }
}
export default App;
