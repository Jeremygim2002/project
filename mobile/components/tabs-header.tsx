import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function TabsHeader() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      style={[styles.container, { paddingTop: Math.max(insets.top - 50, 4) }]}>
      <View style={styles.brandStack}>
        <ThemedText style={styles.brand}>FAZIL</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Gestion de comprobantes
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
    paddingHorizontal: 10,
  },
  brandStack: {
    gap: 2,
  },
  brand: {
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#0b3b78',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
