import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
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

  return (
    <ThemedView style={styles.safeArea}>
      <SafeAreaView style={styles.safeAreaInset}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TabsHeader />

          <View style={styles.kpiGrid}>
            <KpiCard title="TOTAL MES" value={formatCompactMoney(summary?.totalMes)} />
            <KpiCard title="PROMEDIO" value={formatCompactMoney(summary?.promedioComprobante)} />
            <KpiCard title="COMPROBANTES" value={String(summary?.comprobantesMes ?? 0)} />
            <KpiCard title="DETRACCION" value={formatMoney(summary?.detraccionPendiente)} />
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Distribucion de estados
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.splitCard}>
            <SplitRow label="Validados" value={`${validadoPct}%`} color="#0b3b78" />
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
  kpiGrid: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
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
  sectionTitle: {
    fontSize: 14,
    color: '#111827',
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
