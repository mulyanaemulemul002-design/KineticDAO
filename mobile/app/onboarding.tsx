import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { C } from '../constants/colors'
import { useWallet } from '../context/WalletContext'

type Mode = 'landing' | 'import'

export default function Onboarding() {
  const { generateWallet, importWallet } = useWallet()
  const [mode,       setMode]    = useState<Mode>('landing')
  const [pkInput,    setPkInput] = useState('')
  const [loading,    setLoading] = useState(false)
  const insets = useSafeAreaInsets()

  async function handleGenerate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(true)
    try {
      await generateWallet()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    if (!pkInput.trim()) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLoading(true)
    try {
      await importWallet(pkInput.trim())
    } catch {
      Alert.alert('Invalid Key', 'Please enter a valid private key (64 hex characters).')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.root}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoBox}>
            <Ionicons name="flash" size={32} color={C.onAccent} />
          </View>
          <Text style={s.appName}>Kinetic<Text style={{ color: C.accent }}>DAO</Text></Text>
          <Text style={s.tagline}>Watch Ads · Mine KNTC</Text>
        </View>

        {/* Pre-TGE badge */}
        <View style={s.badge}>
          <View style={s.badgeDot} />
          <Text style={s.badgeText}>Pre-TGE · Maculatus Testnet</Text>
        </View>

        {mode === 'landing' ? (
          <View style={s.actions}>
            {/* Features */}
            {[
              { icon: 'flash-outline' as const,     text: 'Watch 15–30s ads to trigger mining cycles' },
              { icon: 'cube-outline' as const,       text: 'Every cycle recorded on KNTC blockchain' },
              { icon: 'gift-outline' as const,       text: 'Claim real KNTC tokens after TGE' },
            ].map(({ icon, text }) => (
              <View key={text} style={s.featureRow}>
                <View style={s.featureIcon}><Ionicons name={icon} size={18} color={C.accent} /></View>
                <Text style={s.featureText}>{text}</Text>
              </View>
            ))}

            {/* Generate */}
            <TouchableOpacity onPress={handleGenerate} disabled={loading} style={s.primaryBtn} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color={C.onAccent} />
                : <><Ionicons name="add-circle-outline" size={20} color={C.onAccent} /><Text style={s.primaryBtnText}>Generate New Wallet</Text></>
              }
            </TouchableOpacity>

            {/* Import */}
            <TouchableOpacity onPress={() => setMode('import')} style={s.secondaryBtn} activeOpacity={0.8}>
              <Ionicons name="key-outline" size={16} color={C.text} />
              <Text style={s.secondaryBtnText}>Import Private Key</Text>
            </TouchableOpacity>

            <Text style={s.disclaimer}>
              This is a testnet app. Your private key is stored securely on device. Never share it.
            </Text>
          </View>
        ) : (
          <View style={s.actions}>
            <TouchableOpacity onPress={() => setMode('landing')} style={s.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={C.text} />
              <Text style={s.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={s.inputLabel}>Private Key (0x...)</Text>
            <TextInput
              style={s.input}
              value={pkInput}
              onChangeText={setPkInput}
              placeholder="0x..."
              placeholderTextColor={C.subtle}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              secureTextEntry={Platform.OS !== 'web'}
            />

            <TouchableOpacity onPress={handleImport} disabled={loading || !pkInput.trim()} style={[s.primaryBtn, (!pkInput.trim() || loading) && { opacity: 0.45 }]} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color={C.onAccent} />
                : <><Ionicons name="log-in-outline" size={20} color={C.onAccent} /><Text style={s.primaryBtnText}>Import Wallet</Text></>
              }
            </TouchableOpacity>

            <Text style={s.disclaimer}>
              For testnet use only. Your private key never leaves this device.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: C.bg },
  content:         { paddingHorizontal: 28, alignItems: 'center' },
  logoWrap:        { alignItems: 'center', marginBottom: 24 },
  logoBox:         { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14, backgroundColor: C.accent, shadowColor: C.accent, shadowRadius: 20, shadowOpacity: 0.4, elevation: 8 },
  appName:         { fontSize: 34, fontWeight: '900', color: C.white, letterSpacing: -0.5 },
  tagline:         { color: C.muted, fontSize: 14, marginTop: 4 },
  badge:           { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(168,230,255,0.05)', marginBottom: 36 },
  badgeDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: C.green },
  badgeText:       { color: C.accent, fontSize: 12, fontWeight: '600' },
  actions:         { width: '100%', gap: 12 },
  featureRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  featureIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(168,230,255,0.08)' },
  featureText:     { flex: 1, color: C.text, fontSize: 13, lineHeight: 18 },
  primaryBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: C.radius, backgroundColor: C.accent, marginTop: 8, shadowColor: C.accent, shadowRadius: 16, shadowOpacity: 0.35, elevation: 6 },
  primaryBtnText:  { color: C.onAccent, fontWeight: '800', fontSize: 16 },
  secondaryBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: C.radius, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(168,230,255,0.05)' },
  secondaryBtnText:{ color: C.text, fontWeight: '700', fontSize: 15 },
  disclaimer:      { color: C.subtle, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 8 },
  backBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backText:        { color: C.text, fontSize: 15, fontWeight: '600' },
  inputLabel:      { color: C.muted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input:           { width: '100%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, color: C.text, fontFamily: 'monospace', fontSize: 12, minHeight: 80 },
})
