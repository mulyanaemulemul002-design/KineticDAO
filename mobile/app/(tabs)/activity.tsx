import { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Linking, RefreshControl, ActivityIndicator, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { C } from '../../constants/colors'
import {
  getProtocolStats, getRecentEvents,
  TIER_COLOR, TIER_LABEL, EXPLORER_URL,
  formatKNTC, formatAddress,
} from '../../lib/mining'

function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)
  const topPad = Platform.OS === 'web' ? 67 : insets.top

  const { data: protocol, refetch: rProto } = useQuery({
    queryKey: ['protocolStats'],
    queryFn:  getProtocolStats,
    refetchInterval: 30_000,
  })
  const { data: events = [], isLoading, refetch: rEvents } = useQuery({
    queryKey: ['recentEvents'],
    queryFn:  getRecentEvents,
    refetchInterval: 60_000,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([rProto(), rEvents()])
    setRefreshing(false)
  }, [rProto, rEvents])

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Activity</Text>
        <View style={s.livePill}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>Live</Text>
        </View>
      </View>

      {/* Protocol stats */}
      {protocol && (
        <View style={s.statsBar}>
          {[
            { label: 'Cycles',   value: protocol.totalCycles.toString(),              color: C.accent },
            { label: 'Miners',   value: protocol.uniqueMiners.toString(),             color: C.accent },
            { label: 'Mined',    value: `${formatKNTC(protocol.totalMined)} KNTC`,    color: C.green  },
            { label: 'Pool',     value: `${formatKNTC(protocol.poolRemaining)} KNTC`, color: C.yellow },
          ].map(({ label, value, color }) => (
            <View key={label} style={s.statItem}>
              <Text style={[s.statVal, { color }]}>{value}</Text>
              <Text style={s.statLbl}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Events list */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.accent} size="large" />
          <Text style={s.loadingText}>Loading on-chain events...</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={e => e.txHash}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          contentContainerStyle={{ padding: 14, gap: 8, paddingBottom: 24 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={s.center}>
              <Ionicons name="cube-outline" size={40} color={C.subtle} />
              <Text style={s.emptyTitle}>No events yet</Text>
              <Text style={s.emptyText}>Mine your first cycle to see on-chain activity.</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const color = TIER_COLOR[item.tier] ?? C.accent
            return (
              <TouchableOpacity
                onPress={() => Linking.openURL(`${EXPLORER_URL}/tx/${item.txHash}`)}
                style={s.eventCard}
                activeOpacity={0.75}>
                <View style={[s.tierBadge, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
                  <Text style={[s.tierText, { color }]}>{TIER_LABEL[item.tier]}</Text>
                </View>
                <View style={s.eventInfo}>
                  <Text style={s.eventAddr}>{formatAddress(item.address)}</Text>
                  <Text style={s.eventTime}>{item.timestamp ? timeAgo(item.timestamp) : '–'}</Text>
                </View>
                <View style={s.eventRight}>
                  <Text style={[s.eventReward, { color }]}>+{formatKNTC(item.reward)}</Text>
                  <Text style={s.eventUnit}>Credits</Text>
                </View>
                <Ionicons name="open-outline" size={13} color={C.subtle} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTitle:{ color: C.white, fontSize: 20, fontWeight: '900' },
  livePill:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(96,255,176,0.08)', borderWidth: 1, borderColor: 'rgba(96,255,176,0.2)' },
  liveDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  liveText:   { color: C.green, fontSize: 11, fontWeight: '700' },
  statsBar:   { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  statItem:   { flex: 1, alignItems: 'center' },
  statVal:    { fontSize: 12, fontWeight: '800' },
  statLbl:    { color: C.subtle, fontSize: 9, marginTop: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  loadingText:{ color: C.muted, marginTop: 12 },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  emptyText:  { color: C.muted, fontSize: 13, textAlign: 'center' },
  eventCard:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  tierBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tierText:   { fontSize: 10, fontWeight: '800' },
  eventInfo:  { flex: 1 },
  eventAddr:  { color: C.text, fontSize: 12, fontFamily: 'monospace', fontWeight: '600' },
  eventTime:  { color: C.muted, fontSize: 10, marginTop: 2 },
  eventRight: { alignItems: 'flex-end' },
  eventReward:{ fontSize: 14, fontWeight: '800' },
  eventUnit:  { color: C.muted, fontSize: 9, marginTop: 1 },
})
