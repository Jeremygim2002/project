import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

export default function ScannerErrorScreen() {
  const router = useRouter();
  const [validation] = useState(() => getPendingPurchaseValidation());
  const [isSaving, setIsSaving] = useState(false);
  const document = validation?.document;
  const reasons = validation?.reasons ?? [];

  const handleSaveWithErrors = async () => {
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
      Alert.alert('Guardado', `Comprobante guardado con observaciones: ${response.transactionId}`);
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
              Resolucion de Incidencia
            </ThemedText>
          </View>

          <View style={styles.alertBox}>
            <Ionicons name="warning" size={24} color="#b91c1c" />
            <View style={styles.alertCopy}>
              <ThemedText style={styles.alertTitle}>Incidencia Detectada</ThemedText>
              <ThemedText style={styles.alertText}>Corrige el comprobante o guardalo con observaciones.</ThemedText>
            </View>
          </View>

          <ThemedView type="backgroundElement" style={styles.detailsCard}>
            <ThemedText type="smallBold" style={styles.detailsTitle}>
              Datos Revisados
            </ThemedText>

            <DetailRow label="Transaccion" value="Se generara al guardar" />
            <DetailRow label="RUC Emisor" value={document?.ruc || '-'} />
            <DetailRow label="Proveedor" value={document?.sunat?.razonSocial || '-'} />
            <DetailRow label="Monto Total" value={formatMoney(document?.total)} />
            <DetailRow label="Fecha de Emision" value={document?.issueDate ?? '-'} danger />
            <DetailRow label="Sede" value={document?.sedeNombre || '-'} />
            <DetailRow label="Ubicacion" value={document?.ubicacion || '-'} />
            <DetailRow
              label="Tipo de Detraccion"
              value={formatDetractionType(document?.detractionTypeId, document?.detractionDescription)}
            />
            <DetailRow label="SUNAT" value={document?.sunat?.estado ?? 'Pendiente'} />
            <DetailRow label="Condicion" value={document?.sunat?.condicion ?? 'Pendiente'} danger={document?.sunat?.isHabido === false} />
          </ThemedView>

          <View style={styles.reasonList}>
            {reasons.length > 0 ? (
              reasons.map((reason) => (
                <View key={reason} style={styles.reasonPill}>
                  <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
                  <ThemedText style={styles.reasonText}>{reason}</ThemedText>
                </View>
              ))
            ) : null}
          </View>

          <ActionButton
            label="Editar Manualmente"
            variant="secondary"
            icon={<Ionicons name="create-outline" size={18} color="#0f172a" />}
            onPress={() => router.push('/scanner-form' as never)}
            disabled={isSaving}
            style={styles.secondaryButton}
          />

          <ActionButton
            label={isSaving ? 'Guardando...' : 'Guardar con Observaciones'}
            icon={<Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />}
            onPress={handleSaveWithErrors}
            disabled={isSaving}
            style={styles.primaryButton}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function DetailRow({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <ThemedText themeColor="textSecondary" style={styles.detailLabel}>
        {label}
      </ThemedText>
      <ThemedText style={[styles.detailValue, danger ? styles.detailValueDanger : null]}>{value}</ThemedText>
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
  alertBox: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertCopy: {
    flex: 1,
    gap: 4,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#991b1b',
  },
  alertText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#7f1d1d',
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
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailValueDanger: {
    color: '#b91c1c',
  },
  reasonList: {
    marginTop: 16,
    gap: 10,
  },
  reasonPill: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: '#991b1b',
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 14,
    alignSelf: 'stretch',
  },
  primaryButton: {
    marginTop: 14,
    alignSelf: 'stretch',
  },
});
