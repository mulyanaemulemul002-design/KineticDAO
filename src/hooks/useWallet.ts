import { useState, useEffect, useCallback } from 'react'
import { connectWallet, switchToMaculatus } from '../lib/wallet'
import { maculatusTestnet } from '../lib/chain'

interface WalletState {
  address: `0x${string}` | null
  chainId: number | null
  isConnecting: boolean
  isOnCorrectChain: boolean
  error: string | null
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnecting: false,
    isOnCorrectChain: false,
    error: null,
  })

  const checkConnection = useCallback(async () => {
    if (!window.ethereum) return
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as `0x${string}`[]
      const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' }) as string
      const chainId = parseInt(chainIdHex, 16)
      if (accounts.length > 0) {
        setState(s => ({
          ...s,
          address: accounts[0],
          chainId,
          isOnCorrectChain: chainId === maculatusTestnet.id,
        }))
      }
    } catch {
      // wallet not available
    }
  }, [])

  useEffect(() => {
    checkConnection()

    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as `0x${string}`[]
      setState(s => ({ ...s, address: accs[0] ?? null }))
    }

    const handleChainChanged = (chainIdHex: unknown) => {
      const chainId = parseInt(chainIdHex as string, 16)
      setState(s => ({
        ...s,
        chainId,
        isOnCorrectChain: chainId === maculatusTestnet.id,
      }))
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [checkConnection])

  const connect = useCallback(async () => {
    setState(s => ({ ...s, isConnecting: true, error: null }))
    try {
      const accounts = await connectWallet()
      await switchToMaculatus()
      const chainIdHex = await window.ethereum!.request({ method: 'eth_chainId' }) as string
      const chainId = parseInt(chainIdHex, 16)
      setState(s => ({
        ...s,
        address: accounts[0],
        chainId,
        isOnCorrectChain: chainId === maculatusTestnet.id,
        isConnecting: false,
      }))
    } catch (err) {
      setState(s => ({
        ...s,
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Failed to connect wallet',
      }))
    }
  }, [])

  const disconnect = useCallback(() => {
    setState({ address: null, chainId: null, isConnecting: false, isOnCorrectChain: false, error: null })
  }, [])

  return { ...state, connect, disconnect }
}
