import { useCallback, useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useQuery } from '@tanstack/react-query'
import { ethers } from 'ethers'
import { C } from '../../constants/colors'
import { useWallet } from '../../context/WalletContext'
import {
  getUserStats, triggerMine,
  TIER_LABEL, TIER_COLOR, TIER_RANGE, TIER_CHANCE,
  formatKNTC, formatAddress, formatCooldown,
} from '../../lib/mining'
import AdModal from '../../components/AdModal'
import MiningResult from '../../components/MiningResult'

type Phase = 'idle' | 'ad' | 'mining' | 'result'

export default function MineScreen() {
  const { address, privateKey } = useWallet()
  const insets = useSafeAreaInsets()
  const [phase,    setPhase]    = useState<Phase>('idle')
  const [result,   setResult]   = useState<{ reward: ethers.BigNumber; tier: number; txHash: string } | null>(null)
  const [mineError,setMineError]= useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['userStats', address],
    queryFn:  () => getUserStats(address!),
    enabled:  !!address,
    refetchInterval: 30_000,
  })

  const canMine  = stats?.canMine  ?? true
  const cooldown = stats?.cooldown ?? 0
  const cycles   = stats?.cycleCount ?? 0
  const credits  = stats?.pendingClaim ?? ethers.BigNumber.from(0)

  function handleMinePress() {
    if (!canMine || phase !== 'idle') return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setMineError(null)
    setPhase('ad')
  }

  async function handleAdComplete() {
    setPhase('mining')
    try {
      const r = await triggerMine(privateKey!)
      setResult(r)
      setPhase('result')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      refetch()
    } catch (e: any) {
      setMineError(e?.reason || e?.message || 'Transaction failed')
      setPhase('idle')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  function handleReset() {
    setResult(null)
    setPhase('idle')
    refetch()
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const topPad = Platform.OS === 'web' ? 67 : insets.top

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      <AdModal visible={phase === 'ad'} onComplete={handleAdComplete} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.logoRow}>
          <View style={s.logoDot}><Ionicons name="flash" size={16} color={C.onAccent} /></View>
          <Text style={s.headerTitle}>Kinetic<Text style={{ color: C.accent }}>DAO</Text></Text>
        </View>
        {address && (
          <View style={s.addrBadge}>
            <View style={[s.statusDot, { backgroundColor: canMine ? C.green : C.yellow }]} />
            <Text style={s.addrText}>{formatAddress(address)}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        showsVerticalScrollIndicator={false}>

        {/* Pre-TGE notice */}
        <View style={s.noticeBanner}>
          <Ionicons name="lock-closed" size={13} color={C.accent} />
          <Text style={s.noticeText}>
            <Text style={{ color: C.accent, fontWeight: '700' }}>Pre-TGE — </Text>
            Mining earns Kinetic Credits on-chain. Real KNTC claimable after TGE.
          </Text>
        </View>

        {phase === 'result' && result ? (
          <MiningResult reward={result.reward} tier={result.tier} txHash={result.txHash} onReset={handleReset} />
        ) : (
          <>
            {/* Tier legend */}
            <View style={s.tierRow}>
              {[0, 1, 2].map(t => (
                <View key={t} style={[s.tierCard, { borderColor: `${TIER_COLOR[t]}30` }]}>
                  <View style={[s.tierDot, { backgroundColor: TIER_COLOR[t] }]} />
                  <Text style={[s.tierLabel, { color: TIER_COLOR[t] }]}>{TIER_LABEL[t]}</Text>
                  <Text style={s.tierRange}>{TIER_RANGE[t]}</Text>
                  <Text style={s.tierChance}>{TIER_CHANCE[t]}</Text>
                </View>
              ))}
            </View>

            {/* Mine card */}
            <View style={s.mineCard}>
              {/* Status row */}
              <View style={s.statusRow}>
                <View style={s.statusLeft}>
                  <View style={[s.statusDot, { backgroundColor: phase === 'mining' ? C.yellow : canMine ? C.green : C.muted }]} />
                  <Text style={s.statusText}>
                    {isLoading ? 'Loading...' :
                     phase === 'mining' ? 'Recording on-chain...' :
                     canMine ? 'Ready to Mine' : 'Cooldown Active'}
                  </Text>
                </View>
                {credits.gt(0) && (
                  <View style={s.creditsBadge}>
                    <Text style={s.creditsText}>{formatKNTC(credits)} cr</Text>
                  </View>
                )}
              </View>

              {/* Mine button area */}
              <View style={s.mineCenter}>
                {phase === 'mining' ? (
                  <View style={s.miningAnim}>
                    <ActivityIndicator size="large" color={C.accent} />
                    <Text style={s.miningLabel}>Signing & broadcasting...</Text>
                  </View>
                ) : canMine ? (
                  <TouchableOpacity onPress={handleMinePress} style={s.mineBtn} activeOpacity={0.85}>
                    <Ionicons name="flash" size={36} color={C.onAccent} />
                    <Text style={s.mineBtnText}>MINE</Text>
                    <Text style={s.mineBtnSub}>Ad plays, then auto-mines</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.cooldownCard}>
                    <Ionicons name="time-outline" size={28} color={C.muted} />
                    <Text style={s.cooldownLabel}>Next cycle in</Text>
                    <Text style={s.cooldownTimer}>{formatCooldown(cooldown)}</Text>
                    <Text style={s.cooldownSub}>Mining cycles reset every 12 hours</Text>
                  </View>
                )}
              </View>

              {/* Error */}
              {mineError && (
                <View style={s.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={C.red} />
                  <Text style={s.errorText}>{mineError}</Text>
                </View>
              )}
            </View>

            {/* Stats row */}
            <View style={s.statsRow}>
              {[
                { label: 'Cycles',  value: cycles.toString(),        color: C.accent },
                { label: 'Credits', value: formatKNTC(credits),      color: C.green  },
                { label: 'Per Day', value: '2×',                     color: C.yellow },
              ].map(({ label, value, color }) => (
                <View key={label} style={s.statBox}>
                  <Text style={[s.statValue, { color }]}>{value}</Text>
                  <Text style={s.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  logoRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot:     { width: 32, height: 32, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.white, letterSpacing: -0.3 },
  addrBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  addrText:    { color: C.muted, fontSize: 11, fontFamily: 'monospace' },
  statusDot:   { width: 7, height: 7, borderRadius: 4 },
  scroll:      { padding: 16, gap: 14, paddingBottom: 24 },
  noticeBanner:{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(168,230,255,0.05)', borderWidth: 1, borderColor: 'rgba(168,230,255,0.12)' },
  noticeText:  { flex: 1, color: C.muted, fontSize: 12, lineHeight: 17 },
  tierRow:     { flexDirection: 'row', gap: 8 },
  tierCard:    { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, gap: 3 },
  tierDot:     { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  tierLabel:   { fontSize: 11, fontWeight: '800' },
  tierRange:   { color: C.muted, fontSize: 9, textAlign: 'center' },
  tierChance:  { color: C.subtle, fontSize: 9 },
  mineCard:    { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  statusRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  statusLeft:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusText:  { color: C.text, fontSize: 13, fontWeight: '700' },
  creditsBadge:{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(96,255,176,0.1)', borderWidth: 1, borderColor: 'rgba(96,255,176,0.25)' },
  creditsText: { color: C.green, fontSize: 11, fontWeight: '700' },
  mineCenter:  { padding: 24, alignItems: 'center' },
  miningAnim:  { alignItems: 'center', gap: 12 },
  miningLabel: { color: C.muted, fontSize: 13 },
  mineBtn:     { alignItems: 'center', justifyContent: 'center', width: 140, height: 140, borderRadius: 70, backgroundColor: C.accent, shadowColor: C.accent, shadowRadius: 24, shadowOpacity: 0.45, elevation: 10, gap: 4 },
  mineBtnText: { color: C.onAccent, fontWeight: '900', fontSize: 22, letterSpacing: 2 },
  mineBtnSub:  { color: C.onAccent, fontSize: 9, opacity: 0.7, textAlign: 'center' },
  cooldownCard:{ alignItems: 'center', gap: 6 },
  cooldownLabel:{ color: C.muted, fontSize: 13 },
  cooldownTimer:{ color: C.text, fontSize: 32, fontWeight: '900', fontFamily: 'monospace' },
  cooldownSub: { color: C.subtle, fontSize: 11 },
  errorRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 12, padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,80,80,0.08)', borderWidth: 1, borderColor: 'rgba(255,80,80,0.2)' },
  errorText:   { flex: 1, color: C.red, fontSize: 12 },
  statsRow:    { flexDirection: 'row', gap: 8 },
  statBox:     { flex: 1, alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  statValue:   { fontSize: 22, fontWeight: '900' },
  statLabel:   { color: C.muted, fontSize: 10, marginTop: 3, fontWeight: '600' },
})
