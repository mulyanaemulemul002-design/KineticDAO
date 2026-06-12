import React, { createContext, useContext, useEffect, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import { ethers } from 'ethers'
import { Platform } from 'react-native'

const STORE_KEY = 'kineticdao_pk'

interface WalletCtx {
  privateKey:      string | null
  address:         string | null
  loading:         boolean
  generateWallet:  () => Promise<void>
  importWallet:    (pk: string) => Promise<void>
  disconnect:      () => Promise<void>
}

const WalletContext = createContext<WalletCtx>({
  privateKey: null, address: null, loading: true,
  generateWallet: async () => {},
  importWallet:   async () => {},
  disconnect:     async () => {},
})

async function secureGet(key: string) {
  if (Platform.OS === 'web') return localStorage.getItem(key)
  return SecureStore.getItemAsync(key)
}
async function secureSet(key: string, value: string) {
  if (Platform.OS === 'web') { localStorage.setItem(key, value); return }
  return SecureStore.setItemAsync(key, value)
}
async function secureDel(key: string) {
  if (Platform.OS === 'web') { localStorage.removeItem(key); return }
  return SecureStore.deleteItemAsync(key)
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [privateKey, setPrivateKey] = useState<string | null>(null)
  const [address,    setAddress]    = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    secureGet(STORE_KEY).then(pk => {
      if (pk) {
        try {
          const w = new ethers.Wallet(pk)
          setPrivateKey(pk)
          setAddress(w.address)
        } catch {}
      }
      setLoading(false)
    })
  }, [])

  async function generateWallet() {
    const bytes = Crypto.getRandomBytes(32)
    const pk = '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const w  = new ethers.Wallet(pk)
    await secureSet(STORE_KEY, pk)
    setPrivateKey(pk)
    setAddress(w.address)
  }

  async function importWallet(pk: string) {
    const clean = pk.trim().startsWith('0x') ? pk.trim() : `0x${pk.trim()}`
    const w = new ethers.Wallet(clean)
    await secureSet(STORE_KEY, clean)
    setPrivateKey(clean)
    setAddress(w.address)
  }

  async function disconnect() {
    await secureDel(STORE_KEY)
    setPrivateKey(null)
    setAddress(null)
  }

  return (
    <WalletContext.Provider value={{ privateKey, address, loading, generateWallet, importWallet, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
