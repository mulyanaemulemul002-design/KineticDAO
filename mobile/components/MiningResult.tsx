import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ethers } from 'ethers'
import { C } from '../constants/colors'
import { TIER_LABEL, TIER_COLOR, TIER_RATE, EXPLORER_URL, formatRate } from '../lib/mining'

interface MiningResultProps {
  ratePerHour: ethers.BigNumber | null
  tier:        number
  txHash:      string | null
  onReset:     () => void
}

const TIER_ICON: ('sad-outline' | 'happy-outline' | 'star')[] = ['sad-outline', 'happy-outline', 'star']
const TIER_BG = [
  'rgba(255,80,80,0.08)',
  'rgba(168,230,255,0.06)',
  'rgba(96,255,176,0.08)',
]

export default function MiningResult({ ratePerHour, tier, txHash, onReset }: MiningResultProps) {
  const safeTier = (typeof tier === 'number' && tier >= 0 && tier <= 2 ? tier : 1)
  const color    = TIER_COLOR[safeTier]
  const bg       = TIER_BG[safeTier]
  const icon     = TIER_ICON[safeTier]
  const label    = TIER_LABEL[safeTier]
  const rate     = TIER_RATE[safeTier]

  function openExplorer() {
    if (txHash) Linking.openURL(`${EXPLORER_URL}/tx/${txHash}`)
  }

  return (
    <View style={[s.wrap, { backgroundColor: bg, borderColor: `${color}40` }]}>

      {/* Icon */}
      <View style={[s.iconWrap, { borderColor: `${color}50` }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>

      {/* Tier badge */}
      <View style={[s.badge, { borderColor: `${color}40` }]}>
        <Text style={[s.badgeText, { color }]}>{label.toUpperCase()} TIER</Text>
      </View>

      {/* Rate */}
      <View style={s.rateWrap}>
        <Text style={[s.rateValue, { color }]}>
          {ratePerHour ? formatRate(ratePerHour) : rate}
        </Text>
        <Text style={s.rateLabel}>Mining Rate / hour</Text>
        <Text style={s.subText}>Session active for 24 hours · Points accrue linearly on-chain</Text>
        <Text style={s.subText}>Claimable as real KNTC after TGE</Text>
      </View>

      {/* Tx link */}
      {txHash && (
        <TouchableOpacity onPress={openExplorer} style={s.txRow} activeOpacity={0.7}>
          <Ionicons name="checkmark-circle" size={14} color={C.accent} />
          <Text style={s.txText}>{txHash.slice(0, 16)}...{txHash.slice(-6)}</Text>
          <Ionicons name="open-outline" size={12} color={C.muted} />
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onReset} style={s.resetBtn} activeOpacity={0.8}>
        <Text style={s.resetText}>Back to Mining</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  wrap:      { borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, marginTop: 8 },
  iconWrap:  { width: 68, height: 68, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 14, backgroundColor: 'rgba(0,0,0,0.3)' },
  badge:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 18 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  rateWrap:  { alignItems: 'center', marginBottom: 4 },
  rateValue: { fontSize: 36, fontWeight: '900', lineHeight: 42 },
  rateLabel: { color: C.text, fontSize: 14, fontWeight: '700', marginTop: 4 },
  subText:   { color: C.muted, fontSize: 11, marginTop: 5, textAlign: 'center' },
  txRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(0,16,32,0.5)', borderWidth: 1, borderColor: C.border },
  txText:    { color: C.accent, fontFamily: 'monospace', fontSize: 11 },
  resetBtn:  { marginTop: 18, paddingVertical: 11, paddingHorizontal: 32, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(168,230,255,0.06)' },
  resetText: { color: C.text, fontWeight: '700', fontSize: 14 },
})
