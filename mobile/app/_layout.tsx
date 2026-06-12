import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { WalletProvider, useWallet } from '../context/WalletContext'
import { C } from '../constants/colors'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
})

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { address, loading } = useWallet()
  const segments  = useSegments()
  const router    = useRouter()

  useEffect(() => {
    if (loading) return
    const inOnboarding = segments[0] === 'onboarding'
    if (!address && !inOnboarding) {
      router.replace('/onboarding')
    } else if (address && inOnboarding) {
      router.replace('/(tabs)/')
    }
  }, [address, loading, segments])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <WalletProvider>
            <StatusBar style="light" backgroundColor={C.bg} />
            <RouteGuard>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="onboarding" />
              </Stack>
            </RouteGuard>
          </WalletProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
