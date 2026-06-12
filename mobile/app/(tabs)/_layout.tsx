import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C } from '../../constants/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TabLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.tabBg,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: (Platform.OS === 'web' ? 84 : 60) + insets.bottom,
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor:   C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Mine',
          tabBarIcon: ({ color }) => <Ionicons name="flash" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <Ionicons name="pulse" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
        }}
      />
    </Tabs>
  )
}
