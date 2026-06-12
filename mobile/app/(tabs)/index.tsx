import { useCallback, useEffect, useRef, useState } from 'react'
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
  getUserStats, triggerMine, getCurrentRank,
  computeLivePoints,
  TIER_LABEL, TIER_COLOR, TIER_RATE, TIER_CHANCE,
  RANK_COLOR, RANK_NAME,
  SESSION_MAX_S,
  formatPoints, formatRate, formatDuration, formatAddress,
} from '../../lib/mining'
import AdModal from '../../components/AdModal'
import MiningResult from '../../components/MiningResult'

type Phase = 'idle' | 'ad' | 'mining' | 'result'

// ─── Live counter hook ────────────────────────────────────────────────────────
function useLivePoints(
  accumulatedPoints: ethers.BigNumber,
  ratePerHour: ethers.BigNumber,
  lastMiningTime: number,
): ethers.BigNumber {
  const [live, setLive] = useState<ethers.BigNumber>(accumulatedPoints)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (ratePerHour.isZero() || lastMiningTime === 0) {
      setLive(accumulatedPoints)
      return
    }
    function tick() {
      setLive(computeLivePoints(accumulatedPoints, ratePerHour, lastMiningTime))
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [accumulatedPoints.toString(), ratePerHour.toString(), lastMiningTime])

  return live
}

// ─── Session countdown hook ───────────────────────────────────────────────────
function useSessionCountdown(sessionTimeLeft: number): number {
  const [remaining, setRemaining] = useState(sessionTimeLeft)
  useEffect(() => {
    setRemaining(sessionTimeLeft)
    if (sessionTimeLeft <= 0) return
    const id = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [sessionTimeLeft])
  return remaining
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MineScreen() {
  const { address, privateKey } = useWallet()
  const insets = useSafeAreaInsets()

  const [phase,     setPhase]     = useState<Phase>('idle')
  const [result,    setResult]    = useState<{ ratePerHour: ethers.BigNumber; tier: number; txHash: string } | null>(null)
  const [mineError, setMineError] = useState<string | null>(null)
  const [refreshing,setRefreshing]= useState(false)

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['userStats', address],
    queryFn:  () => getUserStats(address!),
    enabled:  !!address,
    refetchInterval: 30_000,
  })

  const { data: rankData } = useQuery({
    queryKey: ['rank'],
    queryFn:  () => getCurrentRank(),
    refetchInterval: 60_000,
  })

  const zero          = ethers.BigNumber.from(0)
  const canMine       = stats?.canMine         ?? true
  const cooldownSecs  = stats?.cooldown        ?? 0
  const cycles        = stats?.cycleCount      ?? 0
  const accumulated   = stats?.pendingClaim    ?? zero
  const ratePerHour   = stats?.ratePerHour     ?? zero
  const lastMiningTime= stats?.lastMineAt      ?? 0
  const sessionLeft   = stats?.sessionTimeLeft ?? 0
  const estimatedKNTC = stats?.estimatedKNTC   ?? zero
  const rank          = rankData?.rank         ?? 1
  const rankPct       = rankData?.quotaFillPct ?? 0

  // Real-time live counter
  const livePoints    = useLivePoints(accumulated, ratePerHour, lastMiningTime)
  const sessionRemain = useSessionCountdown(sessionLeft)
  const cooldownRemain= useSessionCountdown(cooldownSecs)

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
            Mining earns on-chain Kinetic Credits. Real KNTC claimable after TGE.
            Blueprint Phase 1: rank-based halving active.
          </Text>
        </View>

        {/* Rank bar */}
        <View style={s.rankCard}>
          <View style={s.rankRow}>
            <View style={[s.rankDot, { backgroundColor: RANK_COLOR[rank] }]} />
            <Text style={[s.rankName, { color: RANK_COLOR[rank] }]}>{RANK_NAME[rank] ?? 'Rank 1'}</Text>
            <Text style={[s.rankPct, { color: RANK_COLOR[rank] }]}>{rankPct}%</Text>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${rankPct}%`, backgroundColor: RANK_COLOR[rank] }]} />
          </View>
          <Text style={s.rankSub}>Global quota · Halving auto-applied</Text>
        </View>

        {phase === 'result' && result ? (
          <MiningResult
            ratePerHour={result.ratePerHour}
            tier={result.tier}
            txHash={result.txHash}
            onReset={handleReset}
          />
        ) : (
          <>
            {/* Tier legend */}
            <View style={s.tierRow}>
              {[0, 1, 2].map(t => (
                <View key={t} style={[s.tierCard, { borderColor: `${TIER_COLOR[t]}30` }]}>
                  <View style={[s.tierDot, { backgroundColor: TIER_COLOR[t] }]} />
                  <Text style={[s.tierLabel, { color: TIER_COLOR[t] }]}>{TIER_LABEL[t]}</Text>
                  <Text style={s.tierRange}>{TIER_RATE[t]}</Text>
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
                {!ratePerHour.isZero() && (
                  <View style={s.rateBadge}>
                    <Text style={s.rateText}>{formatRate(ratePerHour)}</Text>
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
                    <Text style={s.mineBtnSub}>Watch ad · 24h session</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={s.cooldownCard}>
                    <Ionicons name="time-outline" size={28} color={C.muted} />
                    <Text style={s.cooldownLabel}>Next cycle in</Text>
                    <Text style={s.cooldownTimer}>{formatDuration(cooldownRemain)}</Text>
                    <Text style={s.cooldownSub}>Cooldown resets every 24 hours</Text>
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

            {/* Live mining counter — shown when session is active */}
            {!ratePerHour.isZero() && (
              <View style={s.liveCard}>
                <Text style={s.liveLabel}>LIVE MINING COUNTER</Text>
                <Text style={s.livePoints}>{formatPoints(livePoints)}</Text>
                <Text style={s.liveUnit}>credits accumulated</Text>
                <View style={s.liveInfoRow}>
                  <Text style={s.liveInfo}>Rate: <Text style={{ color: C.yellow }}>{formatRate(ratePerHour)}</Text></Text>
                  <View style={s.liveDivider} />
                  <Text style={s.liveInfo}>
                    Session: <Text style={{ color: C.accent }}>{formatDuration(sessionRemain)}</Text>
                  </Text>
                </View>
              </View>
            )}

            {/* Stats row */}
            <View style={s.statsRow}>
              {[
                { label: 'Cycles',    value: cycles.toString(),             color: C.accent },
                { label: 'Credits',   value: formatPoints(livePoints),      color: C.green  },
                { label: 'Est. KNTC', value: estimatedKNTC.gt(0)
                    ? `~${parseFloat(ethers.utils.formatEther(estimatedKNTC)).toFixed(0)}`
                    : '—',                                                   color: C.yellow },
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
  root:         { flex: 1, backgroundColor: C.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot:      { width: 32, height: 32, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '900', color: C.white, letterSpacing: -0.3 },
  addrBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  addrText:     { color: C.muted, fontSize: 11, fontFamily: 'monospace' },
  statusDot:    { width: 7, height: 7, borderRadius: 4 },
  scroll:       { padding: 16, gap: 14, paddingBottom: 24 },
  noticeBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(168,230,255,0.05)', borderWidth: 1, borderColor: 'rgba(168,230,255,0.12)' },
  noticeText:   { flex: 1, color: C.muted, fontSize: 12, lineHeight: 17 },
  rankCard:     { padding: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, gap: 8 },
  rankRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankDot:      { width: 8, height: 8, borderRadius: 4 },
  rankName:     { flex: 1, fontWeight: '700', fontSize: 13 },
  rankPct:      { fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  progressBg:   { height: 4, borderRadius: 4, backgroundColor: 'rgba(168,230,255,0.08)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  rankSub:      { color: C.subtle, fontSize: 10 },
  tierRow:      { flexDirection: 'row', gap: 8 },
  tierCard:     { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, gap: 3 },
  tierDot:      { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  tierLabel:    { fontSize: 11, fontWeight: '800' },
  tierRange:    { color: C.muted, fontSize: 9, textAlign: 'center' },
  tierChance:   { color: C.subtle, fontSize: 9 },
  mineCard:     { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  statusRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  statusLeft:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusText:   { color: C.text, fontSize: 13, fontWeight: '700' },
  rateBadge:    { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(255,208,96,0.1)', borderWidth: 1, borderColor: 'rgba(255,208,96,0.25)' },
  rateText:     { color: C.yellow, fontSize: 11, fontWeight: '700' },
  mineCenter:   { padding: 24, alignItems: 'center' },
  miningAnim:   { alignItems: 'center', gap: 12 },
  miningLabel:  { color: C.muted, fontSize: 13 },
  mineBtn:      { alignItems: 'center', justifyContent: 'center', width: 140, height: 140, borderRadius: 70, backgroundColor: C.accent, shadowColor: C.accent, shadowRadius: 24, shadowOpacity: 0.45, elevation: 10, gap: 4 },
  mineBtnText:  { color: C.onAccent, fontWeight: '900', fontSize: 22, letterSpacing: 2 },
  mineBtnSub:   { color: C.onAccent, fontSize: 9, opacity: 0.7, textAlign: 'center' },
  cooldownCard: { alignItems: 'center', gap: 6 },
  cooldownLabel:{ color: C.muted, fontSize: 13 },
  cooldownTimer:{ color: C.text, fontSize: 32, fontWeight: '900', fontFamily: 'monospace' },
  cooldownSub:  { color: C.subtle, fontSize: 11 },
  errorRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 12, padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,80,80,0.08)', borderWidth: 1, borderColor: 'rgba(255,80,80,0.2)' },
  errorText:    { flex: 1, color: C.red, fontSize: 12 },
  liveCard:     { padding: 20, borderRadius: 16, backgroundColor: 'rgba(96,255,176,0.04)', borderWidth: 1, borderColor: 'rgba(96,255,176,0.15)', alignItems: 'center', gap: 4 },
  liveLabel:    { color: C.muted, fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  livePoints:   { color: C.green, fontSize: 40, fontWeight: '900', fontFamily: 'monospace' },
  liveUnit:     { color: C.muted, fontSize: 12 },
  liveInfoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  liveInfo:     { color: C.muted, fontSize: 11 },
  liveDivider:  { width: 1, height: 10, backgroundColor: 'rgba(168,230,255,0.1)' },
  statsRow:     { flexDirection: 'row', gap: 8 },
  statBox:      { flex: 1, alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  statValue:    { fontSize: 20, fontWeight: '900' },
  statLabel:    { color: C.muted, fontSize: 10, marginTop: 3, fontWeight: '600' },
})
