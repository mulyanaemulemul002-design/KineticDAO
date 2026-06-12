import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C } from '../constants/colors'

interface AdModalProps {
  visible:    boolean
  onComplete: () => void
}

const AD_MIN = 15
const AD_MAX = 30

const ADS = [
  { brand: 'Google Ads',         headline: 'Reach more customers', body: 'Drive sales & leads with targeted campaigns.', accentColor: '#4285F4', icon: 'logo-google' as const },
  { brand: 'Meta for Business',  headline: 'Grow on Facebook & Instagram', body: 'Connect with billions across Meta platforms.', accentColor: '#0866FF', icon: 'logo-facebook' as const },
  { brand: 'TikTok for Business',headline: 'Make ads people watch', body: 'Join 7M advertisers on TikTok.', accentColor: '#ff2d55', icon: 'logo-tiktok' as const },
  { brand: 'KNTC Ecochain',      headline: 'Build the future of Web3', body: 'Deploy smart contracts on KNTC — fast & transparent.', accentColor: '#A8E6FF', icon: 'flash' as const },
]

const { width } = Dimensions.get('window')

export default function AdModal({ visible, onComplete }: AdModalProps) {
  const durationRef              = useRef(Math.floor(Math.random() * (AD_MAX - AD_MIN + 1)) + AD_MIN)
  const [elapsed, setElapsed]    = useState(0)
  const [adIdx]                  = useState(() => Math.floor(Math.random() * ADS.length))
  const intervalRef              = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef                  = useRef(false)
  const progress                 = useRef(new Animated.Value(0)).current
  const fadeIn                   = useRef(new Animated.Value(0)).current

  const ad      = ADS[adIdx]
  const total   = durationRef.current
  const remaining = Math.max(total - elapsed, 0)
  const canSkip   = remaining === 0

  useEffect(() => {
    if (!visible) {
      setElapsed(0)
      doneRef.current = false
      durationRef.current = Math.floor(Math.random() * (AD_MAX - AD_MIN + 1)) + AD_MIN
      progress.setValue(0)
      fadeIn.setValue(0)
      return
    }
    Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }).start()
    intervalRef.current = setInterval(() => {
      setElapsed(e => {
        const next = e + 1
        Animated.timing(progress, {
          toValue: next / durationRef.current,
          duration: 900,
          useNativeDriver: false,
        }).start()
        if (next >= durationRef.current && !doneRef.current) {
          doneRef.current = true
          clearInterval(intervalRef.current!)
          setTimeout(onComplete, 500)
        }
        return next
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [visible])

  function handleSkip() {
    if (!canSkip || doneRef.current) return
    doneRef.current = true
    clearInterval(intervalRef.current!)
    onComplete()
  }

  const barW = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <Animated.View style={[s.overlay, { opacity: fadeIn }]}>
        <View style={s.card}>

          {/* Top bar */}
          <View style={s.topBar}>
            <View style={s.sponsoredRow}>
              <View style={s.sponsoredDot} />
              <Text style={s.sponsoredText}>Sponsored</Text>
            </View>
            <TouchableOpacity
              onPress={handleSkip}
              style={[s.skipBtn, canSkip && s.skipBtnActive]}
              activeOpacity={canSkip ? 0.7 : 1}>
              {canSkip
                ? <><Ionicons name="close" size={13} color={ad.accentColor} /><Text style={[s.skipText, { color: ad.accentColor }]}>Close</Text></>
                : <Text style={s.skipText}>Skip in {remaining}s</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Creative */}
          <View style={[s.creative, { backgroundColor: '#001020' }]}>
            {/* Grid lines */}
            <View style={[StyleSheet.absoluteFillObject, s.grid]} pointerEvents="none" />

            {/* Brand logo */}
            <View style={[s.logoBox, { borderColor: `${ad.accentColor}40` }]}>
              <Ionicons name={ad.icon} size={28} color={ad.accentColor} />
            </View>

            {/* Copy */}
            <Text style={s.adBrand}>{ad.brand}</Text>
            <Text style={s.adHeadline}>{ad.headline}</Text>
            <Text style={s.adBody}>{ad.body}</Text>

            {/* CTA pill */}
            <View style={[s.ctaPill, { borderColor: `${ad.accentColor}50` }]}>
              <Text style={[s.ctaText, { color: ad.accentColor }]}>Learn more</Text>
            </View>

            {/* Waveform */}
            <View style={s.waveform}>
              {Array.from({ length: 22 }).map((_, i) => (
                <View key={i} style={[s.bar, {
                  height: 4 + Math.abs(Math.sin(i * 0.7 + elapsed * 0.5)) * 14,
                  backgroundColor: ad.accentColor,
                }]} />
              ))}
            </View>
          </View>

          {/* Progress */}
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <Animated.View style={[s.progressFill, { width: barW, backgroundColor: canSkip ? C.green : C.accent }]} />
            </View>
            <Text style={[s.countdownText, canSkip && { color: C.green }]}>
              {canSkip ? 'Done' : `${remaining}s`}
            </Text>
          </View>

          {/* Footer hint */}
          <Text style={s.hint}>Mining starts automatically when ad ends</Text>
        </View>
      </Animated.View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,8,16,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card:           { width: '100%', maxWidth: 440, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: '#001020' },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#020c14', borderBottomWidth: 1, borderBottomColor: C.border },
  sponsoredRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sponsoredDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  sponsoredText:  { color: C.muted, fontSize: 11, fontWeight: '600' },
  skipBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(168,230,255,0.04)' },
  skipBtnActive:  { backgroundColor: 'rgba(168,230,255,0.1)' },
  skipText:       { color: C.muted, fontSize: 11, fontWeight: '600' },
  creative:       { paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center' },
  grid:           { opacity: 0.06, backgroundImage: 'linear-gradient(rgba(168,230,255,0.3) 1px,transparent 1px)' },
  logoBox:        { width: 60, height: 60, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 14, backgroundColor: 'rgba(168,230,255,0.06)' },
  adBrand:        { color: C.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  adHeadline:     { color: C.white, fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 8, lineHeight: 26 },
  adBody:         { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  ctaPill:        { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  ctaText:        { fontSize: 12, fontWeight: '700' },
  waveform:       { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginTop: 20, height: 20 },
  bar:            { width: 3, borderRadius: 2, opacity: 0.4 },
  progressWrap:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#020c14' },
  progressTrack:  { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(168,230,255,0.1)', overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 2 },
  countdownText:  { color: C.muted, fontSize: 11, fontFamily: 'monospace', width: 36, textAlign: 'right' },
  hint:           { color: C.subtle, fontSize: 10, textAlign: 'center', paddingBottom: 10, paddingTop: 2 },
})
