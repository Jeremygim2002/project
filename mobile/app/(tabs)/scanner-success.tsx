import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { TabsHeader } from '@/components/tabs-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  clearPendingScannerFlow,
  clonePurchaseValidationWithNewTransaction,
  getPendingPurchaseValidation,
} from '@/services/extracted-document-store';
import { savePurchaseValidation } from '@/services/purchases';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function ScannerSuccessScreen() {
  const router = useRouter();
  const [validation] = useState(() => getPendingPurchaseValidation());
  const [isSaving, setIsSaving] = useState(false);
  const document = validation?.document;

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    if (!validation) {
      Alert.alert('Sin comprobante', 'No hay datos listos para guardar.');
      return;
    }

    try {
      setIsSaving(true);
      const response = await savePurchaseValidation(clonePurchaseValidationWithNewTransaction(validation));
      clearPendingScannerFlow();
      Alert.alert('Guardado', `Comprobante guardado en BigQuery: ${response.transactionId}`);
      router.replace('/(tabs)' as never);
    } catch (error) {
      Alert.alert('No se pudo guardar', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.safeArea}>
      <SafeAreaView style={styles.safeAreaInset}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TabsHeader />

          <View style={styles.titleRow}>
            <ThemedText type="subtitle" style={styles.title}>
              Comprobante Validado
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.heroCard}>
            <ThemedText themeColor="textSecondary" style={styles.heroLabel}>
              MONTO TOTAL
            </ThemedText>
            <ThemedText style={styles.heroAmount}>{formatMoney(document?.total)}</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.detailsCard}>
            <ThemedText type="smallBold" style={styles.detailsTitle}>
              Datos Confirmados
            </ThemedText>

            <DetailRow label="Transaccion" value="Se generara al guardar" icon="pricetag-outline" />
            <DetailRow label="RUC Emisor" value={document?.ruc || '-'} icon="business-outline" />
            <DetailRow label="Proveedor" value={document?.sunat?.razonSocial || '-'} icon="storefront-outline" />
            <DetailRow label="Factura" value={document?.invoiceNumber || '-'} icon="document-text-outline" />
            <DetailRow label="Fecha" value={document?.issueDate || '-'} icon="calendar-outline" />
            <DetailRow label="Sede" value={document?.sedeNombre || '-'} icon="business-outline" />
            <DetailRow label="Ubicacion" value={document?.ubicacion || '-'} icon="map-outline" />
            <DetailRow
              label="Tipo de Detraccion"
              value={formatDetractionType(document?.detractionTypeId, document?.detractionDescription)}
              icon="receipt-outline"
            />
            <DetailRow label="SUNAT" value={document?.sunat?.estado ?? 'Pendiente'} icon="shield-checkmark-outline" />
            <DetailRow label="Condicion" value={document?.sunat?.condicion ?? 'Pendiente'} icon="location-outline" />
          </ThemedView>

          <ActionButton
            label={isSaving ? 'Guardando...' : 'Guardar en BigQuery'}
            icon={<Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />}
            onPress={handleSave}
            disabled={isSaving}
            style={styles.primaryButton}
          />

          <ActionButton
            label="Volver al Inicio"
            variant="secondary"
            icon={<Ionicons name="home-outline" size={18} color="#0f172a" />}
            onPress={() => {
              clearPendingScannerFlow();
              router.replace('/(tabs)' as never);
            }}
            style={styles.secondaryButton}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon: IoniconName }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailHeading}>
        <Ionicons name={icon} size={18} color="#64748b" />
        <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      </View>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

function formatMoney(value?: number | null) {
  return typeof value === 'number' ? `S/ ${value.toFixed(2)}` : 'S/ -';
}


function formatDetractionType(id?: string | null, description?: string | null) {
  return [id, description].filter(Boolean).join(' - ') || '-';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Intenta nuevamente.';
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
    paddingBottom: 32,
  },
  titleRow: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    color: '#111827',
  },
  heroCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#111827',
  },
  confidencePill: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceText: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 13,
  },
  detailsCard: {
    marginTop: 18,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailsTitle: {
    fontSize: 16,
    color: '#111827',
  },
  detailRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    gap: 6,
  },
  detailHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#475569',
  },
  detailValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  primaryButton: {
    marginTop: 18,
    alignSelf: 'stretch',
  },
  secondaryButton: {
    marginTop: 14,
    alignSelf: 'stretch',
  },
});
