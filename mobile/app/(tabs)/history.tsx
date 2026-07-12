import { TabsHeader } from '@/components/tabs-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  formatFechaId,
  formatMoney,
  getProviderName,
  getPurchaseDashboard,
  type PurchaseDashboardRecord,
} from '@/services/dashboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterKey = 'all' | 'success' | 'error';

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'success', label: 'Validados' },
  { key: 'error', label: 'Observados' },
];

export default function HistoryScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [history, setHistory] = useState<PurchaseDashboardRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadHistory = async () => {
        try {
          const dashboard = await getPurchaseDashboard();
          if (isMounted) {
            setHistory(dashboard?.history ?? []);
          }
        } catch {
          if (isMounted) {
            setHistory([]);
          }
        }
      };

      void loadHistory();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const filteredHistory = useMemo(() => {
    if (activeFilter === 'all') {
      return history;
    }

    return history.filter((item) => (activeFilter === 'success' ? item.validacionEstado === 'success' : item.validacionEstado !== 'success'));
  }, [activeFilter, history]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TabsHeader />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {filters.map((filter) => (
            <Pressable
              key={filter.key}
              style={[styles.chip, activeFilter === filter.key ? styles.chipActive : null]}
              onPress={() => setActiveFilter(filter.key)}>
              <ThemedText style={[styles.chipText, activeFilter === filter.key ? styles.chipActiveText : null]}>{filter.label}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <ThemedView type="backgroundElement" style={styles.listCard}>
          {filteredHistory.length > 0 ? (
            filteredHistory.map((row) => <HistoryRow key={row.transactionId} row={row} />)
          ) : (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyTitle}>Sin comprobantes</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Aun no hay registros para este filtro.
              </ThemedText>
            </View>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryRow({ row }: { row: PurchaseDashboardRecord }) {
  const isValid = row.validacionEstado === 'success';

  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={isValid ? 'receipt-outline' : 'warning-outline'} size={18} color={isValid ? '#0b3b78' : '#dc2626'} />
      </View>
      <View style={styles.rowBody}>
        <ThemedText style={styles.rowTitle}>{getProviderName(row)}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.rowDate}>
          {formatFechaId(row.fechaId)}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.rowDate}>
          Detraccion: {formatMoney(row.montoDetraccion)}
        </ThemedText>
      </View>
      <View style={styles.rowMeta}>
        <ThemedText style={styles.rowAmount}>{formatMoney(row.importeTotal)}</ThemedText>
        <Ionicons name={isValid ? 'cloud-done-outline' : 'cloud-offline-outline'} size={16} color={isValid ? '#0b3b78' : '#dc2626'} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginTop: 8 },
  chipsRow: {
    gap: 10,
    paddingTop: 16,
    paddingBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#0b3b78' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  chipActiveText: { color: '#ffffff' },
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#f1f5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  rowDate: { marginTop: 3, fontSize: 13 },
  rowMeta: { alignItems: 'flex-end', gap: 6 },
  rowAmount: { fontSize: 15, fontWeight: '800', color: '#0b3b78' },
  emptyState: {
    padding: 18,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  emptyText: {
    fontSize: 13,
  },
});
