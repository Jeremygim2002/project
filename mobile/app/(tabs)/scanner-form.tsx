import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { ChoiceModal, FormField, SelectField } from '@/components/form-controls';
import { TabsHeader } from '@/components/tabs-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getTipoDetraccionLabel, getTiposDetraccion, type TipoDetraccion } from '@/services/detracciones';
import { type ExtractedInvoiceDocument } from '@/services/documents';
import {
  getPendingExtractedDocumentSnapshot,
  getPendingPurchaseValidation,
  setPendingPurchaseValidation,
  type PurchaseDocumentDraft,
} from '@/services/extracted-document-store';
import { getRucConsultation, type RucConsultation } from '@/services/sunat';

type InvoiceDateStatus = 'current' | 'past' | 'future' | 'pending';

const FALLBACK_TIPOS_DETRACCION: TipoDetraccion[] = [
  {
    tipoDetraccionId: '009',
    descripcion: 'Demas servicios gravados con el IGV',
    tasaPct: 12,
    vigente: true,
  },
  {
    tipoDetraccionId: '010',
    descripcion: 'Residuos, subproductos, desechos, recortes y desperdicios',
    tasaPct: 15,
    vigente: true,
  },
  {
    tipoDetraccionId: '004',
    descripcion: 'Servicio de transporte de carga',
    tasaPct: 4,
    vigente: true,
  },
];

export default function ScannerFormScreen() {
  const router = useRouter();
  const [currentDateValue] = useState(() => formatDate(new Date()));
  const [loadedDocumentId, setLoadedDocumentId] = useState<number | null>(null);
  const [extractedDocument, setExtractedDocument] = useState<ExtractedInvoiceDocument | null>(null);
  const [ruc, setRuc] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(currentDateValue);
  const [sedeNombre, setSedeNombre] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [igv, setIgv] = useState('');
  const [total, setTotal] = useState('');
  const [detractionRate, setDetractionRate] = useState('');
  const [detractionAmount, setDetractionAmount] = useState('');
  const [detractionTypeId, setDetractionTypeId] = useState<string | null>(null);
  const [detractionDescription, setDetractionDescription] = useState<string | null>(null);
  const [tiposDetraccion, setTiposDetraccion] = useState<TipoDetraccion[]>(FALLBACK_TIPOS_DETRACCION);
  const [isDetractionOpen, setIsDetractionOpen] = useState(false);
  const [rucConsultation, setRucConsultation] = useState<RucConsultation | null>(null);
  const [isRucLoading, setIsRucLoading] = useState(false);
  const [rucError, setRucError] = useState<string | null>(null);
  const invoiceDateStatus = getInvoiceDateStatus(issueDate, currentDateValue);
  const selectedDetraction = tiposDetraccion.find((tipo) => tipo.tipoDetraccionId === detractionTypeId) ?? null;
  const selectedDetractionLabel = selectedDetraction
    ? getTipoDetraccionLabel(selectedDetraction)
    : detractionDescription ?? '';
  const detractionOptions = tiposDetraccion.map(getTipoDetraccionLabel);

  useFocusEffect(
    useCallback(() => {
      const snapshot = getPendingExtractedDocumentSnapshot();
      const validation = getPendingPurchaseValidation();

      if (!snapshot) {
        if (loadedDocumentId !== null) {
          setLoadedDocumentId(null);
          setExtractedDocument(null);
          applyDraft(createBlankDraft(currentDateValue));
        }
        return;
      }

      if (snapshot.id === loadedDocumentId) {
        return;
      }

      const draft =
        validation?.sourceDocumentId === snapshot.id
          ? validation.document
          : createDraftFromExtractedDocument(snapshot.document, currentDateValue);

      setLoadedDocumentId(snapshot.id);
      setExtractedDocument(snapshot.document);
      applyDraft(draft);
    }, [currentDateValue, loadedDocumentId]),
  );

  useEffect(() => {
    let isMounted = true;

    getTiposDetraccion()
      .then((tipos) => {
        if (isMounted && tipos.length > 0) {
          setTiposDetraccion(tipos);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTiposDetraccion(FALLBACK_TIPOS_DETRACCION);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const normalizedRuc = ruc.replace(/\D/g, '');

    if (normalizedRuc.length !== 11) {
      setRucConsultation(null);
      setRucError(null);
      return;
    }

    let isMounted = true;
    setIsRucLoading(true);
    setRucError(null);

    getRucConsultation(normalizedRuc)
      .then((consultation) => {
        if (isMounted) {
          setRucConsultation(consultation);
        }
      })
      .catch(() => {
        if (isMounted) {
          setRucConsultation(null);
          setRucError('Sin respuesta');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsRucLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [ruc]);

  const applyDraft = (draft: PurchaseDocumentDraft) => {
    setRuc(draft.ruc);
    setInvoiceNumber(draft.invoiceNumber);
    setIssueDate(draft.issueDate);
    setSedeNombre(draft.sedeNombre);
    setUbicacion(draft.ubicacion);
    setSubtotal(formatMoneyInput(draft.subtotal));
    setIgv(formatMoneyInput(draft.igv));
    setTotal(formatMoneyInput(draft.total));
    setDetractionRate(formatPercentInput(draft.detractionRate));
    setDetractionAmount(formatMoneyInput(draft.detractionAmount));
    setDetractionTypeId(draft.detractionTypeId);
    setDetractionDescription(draft.detractionDescription);
    setRucConsultation(draft.sunat);
  };

  const handleNext = () => {
    const validation = evaluateValidation({
      issueDate,
      detractionTypeId,
      detractionRate,
      selectedDetraction,
      currentDateValue,
      rucConsultation,
      isRucLoading,
      rucError,
    });

    const purchaseValidation = {
      sourceDocumentId: loadedDocumentId,
      transactionId: '',
      status: validation.isValid ? 'success' : 'error',
      reasons: validation.reasons,
      document: buildDraft({
        ruc,
        invoiceNumber,
        issueDate,
        sedeNombre,
        ubicacion,
        subtotal,
        igv,
        total,
        detractionRate,
        detractionAmount,
        detractionTypeId,
        detractionDescription,
        sunat: rucConsultation,
      }),
      items: extractedDocument?.items ?? [],
      confidence: extractedDocument?.raw?.confidence ?? null,
    } as const;

    setPendingPurchaseValidation(purchaseValidation);

    if (validation.isValid) {
      router.push('/scanner-success' as never);
      return;
    }

    router.push('/scanner-error' as never);
  };

  return (
    <ThemedView style={styles.safeArea}>
      <SafeAreaView style={styles.safeAreaInset}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TabsHeader />

          <View style={styles.statusRow}>
            <View style={[styles.statusChip, getSunatChipStyle(rucConsultation?.isActive, isRucLoading, rucError)]}>
              <ThemedText style={[styles.statusLabel, getSunatLabelStyle(rucConsultation?.isActive, isRucLoading, rucError)]}>
                SUNAT
              </ThemedText>
              <ThemedText style={[styles.statusValue, getSunatValueStyle(rucConsultation?.isActive, isRucLoading, rucError)]}>
                {getSunatValueLabel(rucConsultation?.estado, rucConsultation?.isActive, isRucLoading, rucError)}
              </ThemedText>
            </View>
            <View style={[styles.statusChip, getSunatChipStyle(rucConsultation?.isHabido, isRucLoading, rucError)]}>
              <ThemedText style={[styles.statusLabel, getSunatLabelStyle(rucConsultation?.isHabido, isRucLoading, rucError)]}>
                CONDICION
              </ThemedText>
              <ThemedText style={[styles.statusValue, getSunatValueStyle(rucConsultation?.isHabido, isRucLoading, rucError)]}>
                {getSunatValueLabel(rucConsultation?.condicion, rucConsultation?.isHabido, isRucLoading, rucError)}
              </ThemedText>
            </View>
            <View style={[styles.statusChip, getDateChipStyle(invoiceDateStatus)]}>
              <ThemedText style={[styles.statusLabel, getDateLabelStyle(invoiceDateStatus)]}>FECHA</ThemedText>
              <ThemedText style={[styles.statusValue, getDateValueStyle(invoiceDateStatus)]}>
                {getDateStatusLabel(invoiceDateStatus)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.form}>
            <FormField label="RUC" placeholder="20100047218" value={ruc} onChangeText={setRuc} />
            <FormField label="Numero de Factura" placeholder="E001-4589" value={invoiceNumber} onChangeText={setInvoiceNumber} />
            <FormField
              label="Fecha"
              placeholder={currentDateValue}
              icon="calendar-outline"
              value={issueDate}
              onChangeText={setIssueDate}
            />
            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <FormField label="Sede" placeholder="LURIN" value={sedeNombre} onChangeText={setSedeNombre} />
              </View>
              <View style={styles.gridItem}>
                <FormField label="Ubicacion" placeholder="Carretera Panamericana" value={ubicacion} onChangeText={setUbicacion} />
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <FormField label="Subtotal" placeholder="S/ 1,000.00" value={subtotal} onChangeText={setSubtotal} />
              </View>
              <View style={styles.gridItem}>
                <FormField label="IGV (18%)" placeholder="S/ 180.00" value={igv} onChangeText={setIgv} />
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <FormField label="Total" placeholder="S/ 1,180.00" value={total} onChangeText={setTotal} />
              </View>
              <View style={styles.gridItem}>
                <FormField label="% Detraccion" placeholder="10%" value={detractionRate} onChangeText={setDetractionRate} />
              </View>
            </View>
            <FormField
              label="Monto de Detraccion"
              placeholder="S/ 100.00"
              value={detractionAmount}
              onChangeText={setDetractionAmount}
            />
            <SelectField
              label="Tipo de Detraccion"
              value={selectedDetractionLabel}
              placeholder="Selecciona un tipo"
              onPress={() => setIsDetractionOpen(true)}
            />

            <ThemedView type="backgroundElement" style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <ThemedText themeColor="textSecondary" style={styles.summaryLabel}>
                  Total de Factura:
                </ThemedText>
                <ThemedText style={styles.summaryValue}>{total || '-'}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText themeColor="textSecondary" style={styles.summaryLabel}>
                  Tasa de Detraccion:
                </ThemedText>
                <ThemedText style={styles.summaryValue}>{detractionRate || '-'}</ThemedText>
              </View>
              <View style={styles.summaryRowStrong}>
                <ThemedText themeColor="textSecondary" style={styles.summaryLabel}>
                  Monto de Detraccion:
                </ThemedText>
                <ThemedText style={styles.summaryStrong}>{detractionAmount || '-'}</ThemedText>
              </View>
            </ThemedView>

            {extractedDocument?.items.length ? (
              <ThemedView type="backgroundElement" style={styles.itemsCard}>
                <ThemedText type="smallBold" style={styles.itemsTitle}>
                  Items detectados
                </ThemedText>
                {extractedDocument.items.map((item, index) => (
                  <View key={`${item.codigo ?? 'item'}-${index}`} style={styles.itemRow}>
                    <View style={styles.itemDescription}>
                      <ThemedText style={styles.itemName}>{item.descripcion || 'Item sin descripcion'}</ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.itemMeta}>
                        {formatItemQuantity(item.cantidad, item.unidadMedida)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.itemTotal}>{formatMoneyInput(item.importeTotal) || '-'}</ThemedText>
                  </View>
                ))}
              </ThemedView>
            ) : null}

            <ActionButton
              label="Siguiente"
              icon={<Ionicons name="arrow-forward" size={18} color="#ffffff" />}
              onPress={handleNext}
              style={styles.primaryButton}
            />
          </View>

          <ChoiceModal
            title="Tipo de Detraccion"
            visible={isDetractionOpen}
            options={detractionOptions}
            selectedValue={selectedDetractionLabel}
            onClose={() => setIsDetractionOpen(false)}
            onSelect={(value) => {
              const tipo = tiposDetraccion.find((option) => getTipoDetraccionLabel(option) === value);
              setDetractionTypeId(tipo?.tipoDetraccionId ?? null);
              setDetractionDescription(tipo?.descripcion ?? value);
              setDetractionRate(tipo ? formatPercentInput(tipo.tasaPct) : detractionRate);
              setIsDetractionOpen(false);
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function evaluateValidation({
  issueDate,
  detractionTypeId,
  detractionRate,
  selectedDetraction,
  currentDateValue,
  rucConsultation,
  isRucLoading,
  rucError,
}: {
  issueDate: string;
  detractionTypeId: string | null;
  detractionRate: string;
  selectedDetraction: TipoDetraccion | null;
  currentDateValue: string;
  rucConsultation: RucConsultation | null;
  isRucLoading: boolean;
  rucError: string | null;
}) {
  const reasons: string[] = [];

  if (!detractionTypeId) {
    reasons.push('Tipo de detraccion');
  }

  const parsedDetractionRate = parseNumericInput(detractionRate);

  if (
    selectedDetraction &&
    typeof parsedDetractionRate === 'number' &&
    Math.abs(parsedDetractionRate - selectedDetraction.tasaPct) > 0.01
  ) {
    reasons.push('Tasa de detraccion no coincide con el tipo seleccionado');
  }

  const dateStatus = getInvoiceDateStatus(issueDate, currentDateValue);
  const dateReason = getDateValidationReason(dateStatus);

  if (dateReason) {
    reasons.push(dateReason);
  }

  if (isRucLoading) {
    reasons.push('Consulta SUNAT pendiente');
  } else if (rucError) {
    reasons.push('SUNAT sin respuesta');
  } else if (rucConsultation) {
    if (!rucConsultation.isActive) {
      reasons.push('Empresa inactiva en SUNAT');
    }

    if (!rucConsultation.isHabido) {
      reasons.push('Empresa no habida en SUNAT');
    }
  }

  return {
    isValid: reasons.length === 0,
    reasons,
  };
}

function createBlankDraft(currentDateValue: string): PurchaseDocumentDraft {
  return {
    ruc: '',
    invoiceNumber: '',
    issueDate: currentDateValue,
    sedeNombre: '',
    ubicacion: '',
    subtotal: null,
    igv: null,
    total: null,
    detractionRate: null,
    detractionAmount: null,
    detractionTypeId: null,
    detractionDescription: null,
    sunat: null,
  };
}

function createDraftFromExtractedDocument(document: ExtractedInvoiceDocument, currentDateValue: string): PurchaseDocumentDraft {
  const extracted = document.document;

  return {
    ruc: extracted.ruc ?? '',
    invoiceNumber: formatInvoiceNumber(extracted.serie, extracted.numero),
    issueDate: formatDocumentDate(extracted.fecha) ?? currentDateValue,
    sedeNombre: '',
    ubicacion: '',
    subtotal: extracted.opGravada ?? null,
    igv: extracted.igv ?? null,
    total: extracted.importeTotal ?? null,
    detractionRate: extracted.tasaDetraccionPct ?? null,
    detractionAmount: extracted.montoDetraccion ?? null,
    detractionTypeId: getDefaultDetractionTypeId(extracted.tasaDetraccionPct),
    detractionDescription: getDefaultDetractionDescription(extracted.tasaDetraccionPct),
    sunat: null,
  };
}

function buildDraft({
  ruc,
  invoiceNumber,
  issueDate,
  sedeNombre,
  ubicacion,
  subtotal,
  igv,
  total,
  detractionRate,
  detractionAmount,
  detractionTypeId,
  detractionDescription,
  sunat,
}: {
  ruc: string;
  invoiceNumber: string;
  issueDate: string;
  sedeNombre: string;
  ubicacion: string;
  subtotal: string;
  igv: string;
  total: string;
  detractionRate: string;
  detractionAmount: string;
  detractionTypeId: string | null;
  detractionDescription: string | null;
  sunat: RucConsultation | null;
}): PurchaseDocumentDraft {
  return {
    ruc,
    invoiceNumber,
    issueDate,
    sedeNombre,
    ubicacion,
    subtotal: parseNumericInput(subtotal),
    igv: parseNumericInput(igv),
    total: parseNumericInput(total),
    detractionRate: parseNumericInput(detractionRate),
    detractionAmount: parseNumericInput(detractionAmount),
    detractionTypeId,
    detractionDescription,
    sunat,
  };
}

function getInvoiceDateStatus(value: string, currentValue: string): InvoiceDateStatus {
  const currentDate = parseDate(currentValue);
  const selectedDate = parseDate(value);

  if (!currentDate || !selectedDate) {
    return 'pending';
  }

  const currentMonth = currentDate.getFullYear() * 12 + currentDate.getMonth();
  const selectedMonth = selectedDate.getFullYear() * 12 + selectedDate.getMonth();

  if (selectedMonth === currentMonth) {
    return 'current';
  }

  return selectedMonth < currentMonth ? 'past' : 'future';
}

function parseDate(value: string) {
  const trimmedValue = value.trim();
  const isoMatch = trimmedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const slashMatch = trimmedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!isoMatch && !slashMatch) {
    return null;
  }

  const [, first, second, third] = isoMatch ?? slashMatch ?? [];
  const year = Number(isoMatch ? first : third);
  const month = Number(second);
  const day = Number(isoMatch ? third : first);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatDocumentDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsedDate = parseDate(value);

  if (!parsedDate) {
    return null;
  }

  return formatDate(parsedDate);
}

function formatInvoiceNumber(serie?: string, numero?: string) {
  if (!serie && !numero) {
    return '';
  }

  return [serie, numero].filter(Boolean).join('-');
}

function formatMoneyInput(value?: number | null) {
  if (typeof value !== 'number') {
    return '';
  }

  return `S/ ${value.toFixed(2)}`;
}

function formatPercentInput(value?: number | null) {
  if (typeof value !== 'number') {
    return '';
  }

  return `${value}%`;
}

function parseNumericInput(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function getDefaultDetractionTypeId(value?: number | null) {
  if (value === 15) {
    return '010';
  }

  if (value === 12) {
    return '009';
  }

  if (value === 4) {
    return '004';
  }

  return null;
}

function getDefaultDetractionDescription(value?: number | null) {
  if (value === 15) {
    return 'Residuos, subproductos, desechos, recortes y desperdicios';
  }

  if (value === 12) {
    return 'Demas servicios gravados con el IGV';
  }

  if (value === 4) {
    return 'Servicio de transporte de carga';
  }

  return null;
}

function formatItemQuantity(quantity?: number, unit?: string) {
  if (typeof quantity !== 'number' && !unit) {
    return '-';
  }

  return [typeof quantity === 'number' ? quantity.toString() : null, unit].filter(Boolean).join(' ');
}

function getSunatValueLabel(value: string | null | undefined, isOk: boolean | undefined, isLoading: boolean, error: string | null) {
  if (isLoading) {
    return 'CONSULTANDO';
  }

  if (error) {
    return error.toUpperCase();
  }

  if (typeof isOk !== 'boolean') {
    return 'PENDIENTE';
  }

  return (value ?? 'SIN DATO').toUpperCase();
}

function getSunatChipStyle(isOk: boolean | undefined, isLoading: boolean, error: string | null) {
  if (isLoading || error || typeof isOk !== 'boolean') {
    return styles.statusChipPending;
  }

  return isOk ? styles.statusChipOk : styles.statusChipWarning;
}

function getSunatLabelStyle(isOk: boolean | undefined, isLoading: boolean, error: string | null) {
  if (isLoading || error || typeof isOk !== 'boolean') {
    return styles.statusLabelPending;
  }

  return isOk ? styles.statusLabelOk : styles.statusLabelWarning;
}

function getSunatValueStyle(isOk: boolean | undefined, isLoading: boolean, error: string | null) {
  if (isLoading || error || typeof isOk !== 'boolean') {
    return styles.statusValuePending;
  }

  return isOk ? styles.statusValueOk : styles.statusValueWarning;
}

function getDateStatusLabel(status: InvoiceDateStatus) {
  if (status === 'current') {
    return 'ACTUAL';
  }

  if (status === 'past') {
    return 'PASADO';
  }

  if (status === 'future') {
    return 'FUTURA';
  }

  return 'REVISAR';
}

function getDateValidationReason(status: InvoiceDateStatus) {
  if (status === 'past') {
    return 'Comprobante de mes anterior';
  }

  if (status === 'future') {
    return 'Comprobante con fecha futura';
  }

  if (status === 'pending') {
    return 'Fecha de factura por revisar';
  }

  return null;
}

function getDateChipStyle(status: InvoiceDateStatus) {
  return status === 'current' ? styles.statusChipOk : styles.statusChipWarning;
}

function getDateLabelStyle(status: InvoiceDateStatus) {
  return status === 'current' ? styles.statusLabelOk : styles.statusLabelWarning;
}

function getDateValueStyle(status: InvoiceDateStatus) {
  return status === 'current' ? styles.statusValueOk : styles.statusValueWarning;
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
  statusRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 58,
    paddingHorizontal: 6,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statusChipOk: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  statusChipWarning: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  statusChipPending: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f8fafc',
  },
  statusLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
  },
  statusLabelOk: {
    color: '#16a34a',
  },
  statusLabelWarning: {
    color: '#ea580c',
  },
  statusLabelPending: {
    color: '#64748b',
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusValueOk: {
    color: '#166534',
  },
  statusValueWarning: {
    color: '#9a3412',
  },
  statusValuePending: {
    color: '#475569',
  },
  form: {
    marginTop: 18,
    gap: 14,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 8,
  },
  itemsCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 10,
  },
  itemsTitle: {
    fontSize: 14,
    color: '#111827',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  itemDescription: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  itemMeta: {
    fontSize: 12,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0b3b78',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryRowStrong: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 13,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0b3b78',
  },
  summaryStrong: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0b3b78',
  },
  primaryButton: {
    marginTop: 6,
  },
});
