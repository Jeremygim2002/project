import Ionicons from '@expo/vector-icons/Ionicons';
import {
  CameraView,
  useCameraPermissions,
  type CameraCapturedPicture,
} from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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

type CaptureStep = 'camera' | 'review' | 'processing';

const MIN_IMAGE_SIDE = 900;

export default function ScannerScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<CaptureStep>('camera');
  const [capturedPhoto, setCapturedPhoto] =
    useState<CameraCapturedPicture | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const hasPermission = permission?.granted;

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady || step !== 'camera') {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.82,
        exif: false,
        skipProcessing: false,
      });

      const warning = getPhotoQualityWarning(photo);
      if (warning) {
        Alert.alert('Revisa la foto', warning);
      }

      setCapturedPhoto(photo);
      setStep('review');
    } catch (error) {
      Alert.alert('No se pudo capturar', getErrorMessage(error));
    }
  };

  const handleProcessPhoto = async () => {
    if (!capturedPhoto) {
      return;
    }

    try {
      clearPendingScannerFlow();
      setStep('processing');
      const extractedDocument = await extractInvoiceDocument({
        uri: capturedPhoto.uri,
        name: `factura-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });

      setPendingExtractedDocument(extractedDocument);
      router.replace('/scanner-form' as never);
      setCapturedPhoto(null);
      setStep('camera');
    } catch (error) {
      clearPendingScannerFlow();
      Alert.alert('No se pudo procesar', getErrorMessage(error));
      setStep('review');
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setStep('camera');
  };

  if (!permission) {
    return (
      <ThemedView style={styles.safeArea}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color="#0b3b78" size="large" />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!hasPermission) {
    return (
      <ThemedView style={styles.safeArea}>
        <SafeAreaView style={styles.safeAreaInset}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <TabsHeader />
            <ThemedView type="backgroundElement" style={styles.permissionCard}>
              <View style={styles.permissionIcon}>
                <Ionicons name="camera-outline" size={30} color="#0b3b78" />
              </View>
              <ThemedText type="subtitle" style={styles.permissionTitle}>
                Permiso de camara
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.permissionText}>
                Necesitamos acceder a la camara para capturar la factura y enviarla a revision.
              </ThemedText>
              <ActionButton
                label="Permitir camara"
                icon={<Ionicons name="checkmark" size={18} color="#ffffff" />}
                onPress={() => void requestPermission()}
                style={styles.primaryButton}
              />
            </ThemedView>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (step === 'processing') {
    return (
      <ThemedView style={styles.safeArea}>
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator color="#0b3b78" size="large" />
          <ThemedText style={styles.processingTitle}>Procesando factura</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.processingText}>
            Document AI esta extrayendo los datos del comprobante.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (step === 'review' && capturedPhoto) {
    return (
      <ThemedView style={styles.safeArea}>
        <SafeAreaView style={styles.safeAreaInset}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <TabsHeader />
            <ThemedText type="subtitle" style={styles.reviewTitle}>
              Revisa la foto
            </ThemedText>
            <Image source={{ uri: capturedPhoto.uri }} style={styles.previewImage} />
            <ThemedView type="backgroundElement" style={styles.checkCard}>
              {qualityChecks.map((item) => (
                <View key={item} style={styles.checkRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                  <ThemedText style={styles.checkText}>{item}</ThemedText>
                </View>
              ))}
            </ThemedView>
            <ActionButton
              label="Usar esta foto"
              icon={<Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />}
              onPress={() => void handleProcessPhoto()}
              style={styles.primaryButton}
            />
            <ActionButton
              label="Tomar otra"
              variant="secondary"
              icon={<Ionicons name="camera-reverse-outline" size={18} color="#0f172a" />}
              onPress={handleRetake}
              style={styles.secondaryButton}
            />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <View style={styles.cameraScreen}>
      <CameraView
        ref={cameraRef}
        active={step === 'camera'}
        animateShutter
        facing="back"
        flash="auto"
        mode="picture"
        onCameraReady={() => setIsCameraReady(true)}
        style={styles.camera}
      >
        <SafeAreaView style={styles.cameraOverlay}>
          <View style={styles.cameraTopBar}>
            <Pressable
              accessibilityRole="button"
              style={styles.iconButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#ffffff" />
            </Pressable>
            <ThemedText style={styles.cameraTitle}>Capturar factura</ThemedText>
            <View style={styles.iconButtonPlaceholder} />
          </View>

          <View style={styles.frameWrap}>
            <View style={styles.captureFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>

          <View style={styles.cameraBottom}>
            <View style={styles.guidanceCard}>
              <GuidanceRow text="Coloca toda la factura dentro del marco." />
              <GuidanceRow text="Usa buena luz y evita sombras fuertes." />
              <GuidanceRow text="Sostén el celular estable y enfoca el texto." />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={!isCameraReady}
              style={[styles.shutterButton, !isCameraReady && styles.shutterDisabled]}
              onPress={() => void handleCapture()}
            >
              <View style={styles.shutterInner} />
            </Pressable>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

function GuidanceRow({ text }: { text: string }) {
  return (
    <View style={styles.guidanceRow}>
      <Ionicons name="checkmark-circle-outline" size={16} color="#bfdbfe" />
      <ThemedText style={styles.guidanceText}>{text}</ThemedText>
    </View>
  );
}

function getPhotoQualityWarning(photo: CameraCapturedPicture) {
  const smallerSide = Math.min(photo.width, photo.height);

  if (smallerSide < MIN_IMAGE_SIDE) {
    return 'La imagen salio con baja resolucion. Si el texto se ve borroso, toma otra foto antes de procesar.';
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Intenta nuevamente.';
}

const qualityChecks = [
  'El RUC, fecha, numero y total se ven legibles.',
  'La factura esta completa dentro del marco.',
  'La imagen no esta movida ni oscura.',
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  safeAreaInset: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  permissionCard: {
    alignItems: 'center',
    borderColor: '#e5e7eb',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 12,
    padding: 20,
  },
  permissionIcon: {
    alignItems: 'center',
    backgroundColor: '#eaf2ff',
    borderRadius: 16,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  permissionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  processingTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  processingText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  reviewTitle: {
    color: '#111827',
    fontSize: 22,
    marginBottom: 12,
    marginTop: 8,
  },
  previewImage: {
    aspectRatio: 3 / 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 18,
    width: '100%',
  },
  checkCard: {
    borderColor: '#e5e7eb',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 16,
    padding: 14,
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  checkText: {
    color: '#0f172a',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  primaryButton: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
  secondaryButton: {
    alignSelf: 'stretch',
    marginTop: 12,
  },
  cameraScreen: {
    backgroundColor: '#000000',
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconButtonPlaceholder: {
    height: 42,
    width: 42,
  },
  cameraTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  frameWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  captureFrame: {
    aspectRatio: 3 / 4,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: '82%',
    position: 'relative',
    width: '100%',
  },
  corner: {
    borderColor: '#ffffff',
    height: 34,
    position: 'absolute',
    width: 34,
  },
  cornerTopLeft: {
    borderLeftWidth: 4,
    borderTopWidth: 4,
    left: -1,
    top: -1,
  },
  cornerTopRight: {
    borderRightWidth: 4,
    borderTopWidth: 4,
    right: -1,
    top: -1,
  },
  cornerBottomLeft: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    bottom: -1,
    left: -1,
  },
  cornerBottomRight: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    bottom: -1,
    right: -1,
  },
  cameraBottom: {
    alignItems: 'center',
    gap: 18,
    paddingBottom: 28,
    paddingHorizontal: 18,
  },
  guidanceCard: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  guidanceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  guidanceText: {
    color: '#ffffff',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  shutterButton: {
    alignItems: 'center',
    borderColor: '#ffffff',
    borderRadius: 38,
    borderWidth: 4,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  shutterInner: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  shutterDisabled: {
    opacity: 0.5,
  },
});
