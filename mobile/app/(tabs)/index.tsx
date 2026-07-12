import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabsHeader } from '@/components/tabs-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getCurrentUserProfile, getFirstName } from '@/services/auth';
import { clearPendingScannerFlow } from '@/services/extracted-document-store';
import {
  formatMoney,
  getProviderName,
  getPurchaseDashboard,
  getRecordTitle,
  type PurchaseDashboard,
  type PurchaseDashboardRecord,
} from '@/services/dashboard';

export default function HomeTabScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('Usuario');
  const [dashboard, setDashboard] = useState<PurchaseDashboard | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const profile = await getCurrentUserProfile();
        if (isMounted) {
          setFirstName(getFirstName(profile?.name));
        }
      } catch {
        if (isMounted) {
          setFirstName('Usuario');
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      clearPendingScannerFlow();

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
  const recent = dashboard?.recent ?? [];

  return (
    <ThemedView style={styles.safeArea}>
      <SafeAreaView style={styles.safeAreaInset}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TabsHeader />
          <View style={styles.hero}>
            <ThemedText type="title" style={styles.greeting}>
              Bienvenido, {firstName}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Aqui esta el resumen de tu negocio hoy.
            </ThemedText>

            <View style={styles.cardsRow}>
              <StatCard title="GASTOS DEL MES" value={formatMoney(summary?.totalMes)} />
              <StatCard title="DETRACCION" value={formatMoney(summary?.detraccionPendiente)} />
            </View>
          </View>

          <View style={styles.captureRow}>
            <Pressable style={styles.captureCard} onPress={() => router.push('/scanner')}>
              <View style={styles.captureButton}>
                <Ionicons name="camera" size={35} color="#ffffff" />
                <ThemedText style={styles.captureText}>CAPTURAR</ThemedText>
              </View>
            </Pressable>
            <Pressable style={styles.captureCard} onPress={() => router.push('/(tabs)/upload')}>
              <View style={styles.captureButton}>
                <Ionicons name="cloud-upload-outline" size={35} color="#ffffff" />
                <ThemedText style={styles.captureText}>SUBIR</ThemedText>
              </View>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Actividades Recientes
            </ThemedText>
          </View>

          <View style={styles.activityList}>
            {recent.length > 0 ? (
              recent.map((item) => <ActivityRow key={item.transactionId} item={item} />)
            ) : (
              <ThemedView type="backgroundElement" style={styles.emptyCard}>
                <ThemedText style={styles.emptyTitle}>Sin actividad</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  Captura tu primera factura para empezar.
                </ThemedText>
              </ThemedView>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.statCard}>
      <ThemedText themeColor="textSecondary" style={styles.statLabel}>
        {title}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.statValue}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

function ActivityRow({ item }: { item: PurchaseDashboardRecord }) {
  const isValid = item.validacionEstado === 'success';

  return (
    <ThemedView type="backgroundElement" style={styles.activityRow}>
      <View style={styles.activityIcon}>
        <Ionicons name={isValid ? 'receipt-outline' : 'alert-circle-outline'} size={18} color={isValid ? '#0b3b78' : '#dc2626'} />
      </View>
      <View style={styles.activityBody}>
        <ThemedText type="smallBold" style={styles.activityInvoice}>
          {getRecordTitle(item)}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.activityClient}>
          {getProviderName(item)}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.activityClient}>
          Detraccion: {formatMoney(item.montoDetraccion)}
        </ThemedText>
      </View>
      <View style={styles.activityMeta}>
        <ThemedText type="smallBold" style={styles.activityAmount}>
          {formatMoney(item.importeTotal)}
        </ThemedText>
        <ThemedText style={[styles.activityStatus, isValid ? styles.statusValidado : styles.statusObservado]}>
          {isValid ? 'VALIDADO' : 'OBSERVADO'}
        </ThemedText>
      </View>
    </ThemedView>
  );
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
    paddingBottom: 24,
  },
  hero: { marginTop: 8 },
  greeting: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: { marginTop: 4, fontSize: 16, lineHeight: 22 },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
    paddingBottom: 16,
  },
  statCard: {
    flex: 1,
    minHeight: 112,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
  },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  statValue: { marginTop: 14, color: '#111827' },
  captureRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  captureCard: {
    alignItems: 'center',
  },
  captureButton: {
    width: 104,
    height: 104,
    borderRadius: 16,
    backgroundColor: '#0b3b78',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0b3b78',
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  captureText: { color: '#ffffff', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  sectionHeader: { marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontSize: 18, color: '#111827' },
  activityList: { gap: 12, paddingBottom: 8 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eaf2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityBody: { flex: 1 },
  activityInvoice: { fontSize: 15, color: '#111827' },
  activityClient: { marginTop: 2, fontSize: 12 },
  activityMeta: { alignItems: 'flex-end' },
  activityAmount: { fontSize: 14, color: '#0b3b78' },
  activityStatus: { marginTop: 4, fontSize: 11, fontWeight: '700' },
  statusValidado: { color: '#2563eb' },
  statusObservado: { color: '#dc2626' },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 16,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
