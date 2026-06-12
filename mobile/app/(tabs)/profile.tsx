import { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Clipboard, RefreshControl, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useQuery } from '@tanstack/react-query'
import { ethers } from 'ethers'
import { C } from '../../constants/colors'
import { useWallet } from '../../context/WalletContext'
import { getUserStats, getProtocolStats, getWalletContract, formatKNTC, formatAddress, EXPLORER_URL } from '../../lib/mining'
import { Linking } from 'react-native'

export default function ProfileScreen() {
  const { address, privateKey, disconnect } = useWallet()
  const insets = useSafeAreaInsets()
  const [claiming, setClaiming]     = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied]         = useState(false)
  const topPad = Platform.OS === 'web' ? 67 : insets.top

  const { data: stats, refetch: rStats } = useQuery({
    queryKey: ['userStats', address],
    queryFn:  () => getUserStats(address!),
    enabled:  !!address,
    refetchInterval: 30_000,
  })
  const { data: protocol, refetch: rProto } = useQuery({
    queryKey: ['protocolStats'],
    queryFn:  getProtocolStats,
    refetchInterval: 60_000,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([rStats(), rProto()])
    setRefreshing(false)
  }, [rStats, rProto])

  const pendingClaim = stats?.pendingClaim ?? ethers.BigNumber.from(0)
  const totalMined   = stats?.totalMined   ?? ethers.BigNumber.from(0)
  const totalClaimed = stats?.totalClaimed ?? ethers.BigNumber.from(0)
  const cycleCount   = stats?.cycleCount   ?? 0
  const tgeActive    = stats?.tgeActive    ?? false

  function handleCopy() {
    if (!address) return
    Clipboard.setString(address)
    setCopied(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpenExplorer() {
    if (!address) return
    Linking.openURL(`${EXPLORER_URL}/address/${address}`)
  }

  async function handleClaim() {
    if (!tgeActive || !privateKey) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setClaiming(true)
    try {
      const { contract } = getWalletContract(privateKey)
      const tx = await contract.claimTokens()
      await tx.wait()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Claimed!', `KNTC tokens sent to your wallet.`)
      rStats()
    } catch (e: any) {
      Alert.alert('Claim Failed', e?.reason || e?.message || 'Transaction failed')
    } finally {
      setClaiming(false)
    }
  }

  function handleDisconnect() {
    Alert.alert('Disconnect Wallet', 'This will remove your private key from this device. Make sure you have a backup.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: disconnect },
    ])
  }

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 24 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        showsVerticalScrollIndicator={false}>

        {/* Wallet card */}
        <View style={s.walletCard}>
          <View style={s.walletTop}>
            <View style={s.avatarWrap}>
              <Ionicons name="wallet" size={22} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.walletLabel}>Wallet Address</Text>
              <Text style={s.walletAddr} numberOfLines={1} ellipsizeMode="middle">{address}</Text>
            </View>
          </View>
          <View style={s.walletActions}>
            <TouchableOpacity onPress={handleCopy} style={s.walletActionBtn} activeOpacity={0.7}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? C.green : C.muted} />
              <Text style={[s.walletActionText, copied && { color: C.green }]}>{copied ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenExplorer} style={s.walletActionBtn} activeOpacity={0.7}>
              <Ionicons name="open-outline" size={14} color={C.muted} />
              <Text style={s.walletActionText}>Explorer</Text>
            </TouchableOpacity>
            <View style={s.networkPill}>
              <View style={s.networkDot} />
              <Text style={s.networkText}>Maculatus Testnet</Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View style={s.statsGrid}>
          {[
            { label: 'Mining Cycles',   value: cycleCount.toString(),         color: C.accent  },
            { label: 'Total Credits',   value: formatKNTC(totalMined),        color: C.accent  },
            { label: 'Unclaimed',       value: formatKNTC(pendingClaim),      color: C.green   },
            { label: 'Claimed',         value: formatKNTC(totalClaimed),      color: C.yellow  },
          ].map(({ label, value, color }) => (
            <View key={label} style={s.statCard}>
              <Text style={[s.statValue, { color }]}>{value}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Claim card */}
        <View style={s.claimCard}>
          <View style={s.claimHeader}>
            <View>
              <Text style={s.claimTitle}>Claim KNTC</Text>
              <Text style={s.claimSub}>
                {tgeActive ? 'TGE is active — claim your tokens now.' : 'Klaim aktif otomatis saat TGE.'}
              </Text>
            </View>
            <Ionicons name="gift-outline" size={22} color={tgeActive ? C.green : C.muted} />
          </View>

          <View style={s.claimAmountRow}>
            <Text style={s.claimAmountLabel}>Unclaimed Credits</Text>
            <Text style={s.claimAmount}>{formatKNTC(pendingClaim)} KNTC</Text>
          </View>

          <TouchableOpacity
            onPress={tgeActive ? handleClaim : undefined}
            disabled={!tgeActive || pendingClaim.eq(0) || claiming}
            style={[s.claimBtn, (!tgeActive || pendingClaim.eq(0)) && s.claimBtnDisabled]}
            activeOpacity={0.8}>
            {claiming
              ? <ActivityIndicator color={tgeActive ? C.onAccent : C.muted} />
              : !tgeActive
              ? <><Ionicons name="lock-closed" size={16} color={C.muted} /><Text style={[s.claimBtnText, { color: C.muted }]}>Locked until TGE</Text></>
              : <><Ionicons name="gift-outline" size={16} color={C.onAccent} /><Text style={s.claimBtnText}>Claim to Wallet</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* Protocol stats */}
        {protocol && (
          <View style={s.protoCard}>
            <Text style={s.protoTitle}>Protocol Stats</Text>
            {[
              { label: 'Total Cycles',   value: protocol.totalCycles.toString(),              color: C.accent  },
              { label: 'Unique Miners',  value: protocol.uniqueMiners.toString(),             color: C.accent  },
              { label: 'Pool Remaining', value: `${formatKNTC(protocol.poolRemaining)} KNTC`, color: C.green   },
              { label: 'TGE Status',     value: protocol.tgeActive ? 'Active' : 'Pre-Launch', color: protocol.tgeActive ? C.green : C.yellow },
            ].map(({ label, value, color }) => (
              <View key={label} style={s.protoRow}>
                <Text style={s.protoLabel}>{label}</Text>
                <Text style={[s.protoValue, { color }]}>{value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Disconnect */}
        <TouchableOpacity onPress={handleDisconnect} style={s.disconnectBtn} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={16} color={C.red} />
          <Text style={s.disconnectText}>Disconnect Wallet</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: C.bg },
  header:            { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:       { color: C.white, fontSize: 20, fontWeight: '900' },
  scroll:            { padding: 16, gap: 14 },
  walletCard:        { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 },
  walletTop:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap:        { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(168,230,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  walletLabel:       { color: C.muted, fontSize: 10, fontWeight: '600', marginBottom: 3 },
  walletAddr:        { color: C.text, fontSize: 12, fontFamily: 'monospace' },
  walletActions:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletActionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(168,230,255,0.06)', borderWidth: 1, borderColor: C.border },
  walletActionText:  { color: C.muted, fontSize: 11, fontWeight: '600' },
  networkPill:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(96,255,176,0.06)', borderWidth: 1, borderColor: 'rgba(96,255,176,0.2)' },
  networkDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  networkText:       { color: C.green, fontSize: 10, fontWeight: '600' },
  statsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard:          { width: '47%', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  statValue:         { fontSize: 22, fontWeight: '900' },
  statLabel:         { color: C.muted, fontSize: 10, marginTop: 3, fontWeight: '600' },
  claimCard:         { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12 },
  claimHeader:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  claimTitle:        { color: C.white, fontSize: 15, fontWeight: '800' },
  claimSub:          { color: C.muted, fontSize: 11, marginTop: 3 },
  claimAmountRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.cardInner, borderWidth: 1, borderColor: C.border },
  claimAmountLabel:  { color: C.muted, fontSize: 12 },
  claimAmount:       { color: C.green, fontWeight: '800', fontFamily: 'monospace' },
  claimBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: C.accent },
  claimBtnDisabled:  { backgroundColor: 'rgba(168,230,255,0.08)', borderWidth: 1, borderColor: C.border },
  claimBtnText:      { color: C.onAccent, fontWeight: '800', fontSize: 14 },
  protoCard:         { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, gap: 10 },
  protoTitle:        { color: C.white, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  protoRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  protoLabel:        { color: C.muted, fontSize: 12 },
  protoValue:        { fontSize: 12, fontWeight: '700', fontFamily: 'monospace' },
  disconnectBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,80,80,0.25)', backgroundColor: 'rgba(255,80,80,0.06)' },
  disconnectText:    { color: C.red, fontWeight: '700', fontSize: 14 },
})
