import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabsHeader } from '@/components/tabs-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  formatCompactMoney,
  formatMoney,
  getPurchaseDashboard,
  type PurchaseDashboard,
  type PurchaseProviderMetric,
} from '@/services/dashboard';

export default function AnalyticsScreen() {
  const [dashboard, setDashboard] = useState<PurchaseDashboard | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadDashboard = async () => {
        try {
          const nextDashboard = await getPurchaseDashboard();
          if (isMounted) {
            setDashboard(nextDashboard);
          }
        } catch {
          if (isMounted) {
            setDashboard(null);
          }
        }
      };

      void loadDashboard();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const summary = dashboard?.summary;
  const totalComprobantes = (summary?.validados ?? 0) + (summary?.observados ?? 0);
  const validadoPct = getPercent(summary?.validados ?? 0, totalComprobantes);
  const observadoPct = getPercent(summary?.observados ?? 0, totalComprobantes);
  const pendientePct = Math.max(0, 100 - validadoPct - observadoPct);
  const bars = useMemo(() => buildBars(dashboard), [dashboard]);

  return (
    <ThemedView style={styles.safeArea}>
      <SafeAreaView style={styles.safeAreaInset}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TabsHeader />

          <View style={styles.kpiRow}>
            <KpiCard title="TOTAL MES" value={formatCompactMoney(summary?.totalMes)} />
            <KpiCard title="PROMEDIO" value={formatCompactMoney(summary?.promedioComprobante)} />
          </View>

          <ThemedView type="backgroundElement" style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                Flujo de comprobantes
              </ThemedText>
              <View style={styles.chartPill}>
                <ThemedText style={styles.chartPillText}>Ultimos registros</ThemedText>
              </View>
            </View>
            <View style={styles.chartPlaceholder}>
              {bars.map((height, index) => (
                <View key={`${height}-${index}`} style={[styles.chartBar, { height }]} />
              ))}
            </View>
          </ThemedView>

          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Distribucion
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.splitCard}>
            <SplitRow label="Validados" value={`${validadoPct}%`} color="#0b3b78" />
            <SplitRow label="Pendientes" value={`${pendientePct}%`} color="#f97316" />
            <SplitRow label="Observados" value={`${observadoPct}%`} color="#94a3b8" />
          </ThemedView>

          <View style={styles.sectionHeaderRow}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Principales Proveedores
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.providersCard}>
            {dashboard?.topProviders.length ? (
              dashboard.topProviders.map((provider) => <ProviderRow key={provider.proveedorId} provider={provider} />)
            ) : (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyTitle}>Sin datos</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  Guarda comprobantes para ver proveedores.
                </ThemedText>
              </View>
            )}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.kpiCard}>
      <ThemedText themeColor="textSecondary" style={styles.kpiLabel}>
        {title}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.kpiValue}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

function SplitRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.splitRow}>
      <View style={styles.splitLabel}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <ThemedText style={styles.splitText}>{label}</ThemedText>
      </View>
      <ThemedText style={styles.splitValue}>{value}</ThemedText>
    </View>
  );
}

function ProviderRow({ provider }: { provider: PurchaseProviderMetric }) {
  return (
    <View style={styles.providerRow}>
      <View style={styles.providerIcon}>
        <Ionicons name="briefcase-outline" size={18} color="#0b3b78" />
      </View>
      <View style={styles.providerBody}>
        <ThemedText style={styles.providerName}>{provider.proveedorNombre || provider.proveedorId}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.providerSubtitle}>
          {provider.comprobantes} comprobantes
        </ThemedText>
      </View>
      <ThemedText style={styles.providerAmount}>{formatMoney(provider.total)}</ThemedText>
    </View>
  );
}

function getPercent(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function buildBars(dashboard: PurchaseDashboard | null) {
  const values = (dashboard?.history ?? []).slice(0, 6).map((record) => record.importeTotal);
  const maxValue = Math.max(...values, 1);
  const bars = values.map((value) => Math.max(24, Math.round((value / maxValue) * 92)));

  return bars.length > 0 ? bars : [36, 52, 28, 72, 44, 60];
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  safeAreaInset: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 32,
  },
  hero: {
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
  },
  bigQueryButton: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#0b3b78',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  bigQueryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  kpiRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minHeight: 116,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  kpiValue: {
    marginTop: 10,
    color: '#111827',
  },
  chartCard: {
    marginTop: 18,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#111827',
  },
  chartPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#eaf2ff',
  },
  chartPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0b3b78',
  },
  chartPlaceholder: {
    marginTop: 16,
    height: 120,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  chartBar: {
    width: 16,
    borderRadius: 8,
    backgroundColor: '#0b3b78',
    opacity: 0.18,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 8,
  },
  splitCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
    gap: 12,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  splitLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  splitValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0b3b78',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 8,
  },
  providersCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
    overflow: 'hidden',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  providerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#eaf2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerBody: {
    flex: 1,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  providerSubtitle: {
    marginTop: 2,
    fontSize: 12,
  },
  providerAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0b3b78',
  },
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
