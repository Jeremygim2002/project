import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { TabsHeader } from '@/components/tabs-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { extractInvoiceDocument } from '@/services/documents';
import {
  clearPendingScannerFlow,
  setPendingExtractedDocument,
} from '@/services/extracted-document-store';

export default function UploadScreen() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset) {
        Alert.alert('Archivo no encontrado', 'No se pudo leer el archivo seleccionado.');
        return;
      }

      clearPendingScannerFlow();
      setIsProcessing(true);
      const extractedDocument = await extractInvoiceDocument(asset);
      setPendingExtractedDocument(extractedDocument);
      router.push('/scanner-form');
    } catch (error) {
      clearPendingScannerFlow();
      Alert.alert('No se pudo procesar', getErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ThemedView style={styles.safeArea}>
      <SafeAreaView style={styles.safeAreaInset}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TabsHeader />

          <ThemedView type="backgroundElement" style={styles.uploadCard}>
            <View style={styles.uploadIcon}>
              <Ionicons name="cloud-upload-outline" size={28} color="#0b3b78" />
            </View>
            <ThemedText type="smallBold" style={styles.uploadTitle}>
              Subir comprobante
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.uploadText}>
              Sube una foto o archivo del comprobante y luego valida la información en el mismo formulario.
            </ThemedText>
            <ActionButton
              label={isProcessing ? 'Procesando...' : 'Seleccionar archivo'}
              icon={<Ionicons name="image-outline" size={18} color="#ffffff" />}
              disabled={isProcessing}
              onPress={handlePickDocument}
              style={styles.uploadButton}
            />
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Intenta nuevamente con un PDF o imagen del comprobante.';
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
  uploadCard: {
    marginTop: 8,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    gap: 8,
  },
  uploadIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#eaf2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 16,
    color: '#111827',
  },
  uploadText: {
    fontSize: 12,
    textAlign: 'center',
  },
  infoCard: {
    marginTop: 18,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  infoTitle: {
    fontSize: 15,
    color: '#111827',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
  },
  uploadButton: {
    marginTop: 6,
    alignSelf: 'stretch',
  },
  primaryButton: {
    marginTop: 18,
    alignSelf: 'stretch',
  },
});
