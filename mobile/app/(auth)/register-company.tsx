import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { registerAdminCompany, type MypeProfile } from '@/services/auth';

export default function RegisterCompanyScreen() {
  const router = useRouter();
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [distrito, setDistrito] = useState('');
  const [createdMype, setCreatedMype] = useState<MypeProfile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const normalizedRuc = ruc.replace(/\D/g, '');

    if (normalizedRuc.length !== 11 || !razonSocial.trim() || !distrito.trim()) {
      Alert.alert('Datos incompletos', 'Completa RUC, razon social y distrito.');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await registerAdminCompany({
        ruc: normalizedRuc,
        razonSocial: razonSocial.trim(),
        distrito: distrito.trim(),
      });
      setCreatedMype(response.mype);
    } catch (error: unknown) {
      Alert.alert('No se pudo crear la empresa', String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#0b3b78" />
          </Pressable>

          <ThemedText style={styles.title}>Crear nueva empresa</ThemedText>
          <ThemedText style={styles.description}>
            Registra los datos principales de tu MYPE para activar tu cuenta como administrador.
          </ThemedText>

          {createdMype ? (
            <View style={styles.successBox}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={30} color="#166534" />
              </View>
              <ThemedText style={styles.successTitle}>Empresa creada</ThemedText>
              <ThemedText style={styles.successText}>
                Comparte este codigo con los empleados que quieras unir a tu empresa.
              </ThemedText>
              <View style={styles.codeBox}>
                <ThemedText style={styles.code}>{createdMype.codigoInvitacion}</ThemedText>
              </View>
              <Pressable style={styles.primaryButton} onPress={() => router.replace('/(tabs)' as never)}>
                <ThemedText style={styles.primaryButtonText}>Entrar a Fazil</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <InputField
                label="RUC"
                value={ruc}
                onChangeText={setRuc}
                placeholder="20123456789"
                keyboardType="number-pad"
                maxLength={11}
              />
              <InputField
                label="Razon social"
                value={razonSocial}
                onChangeText={setRazonSocial}
                placeholder="Mi empresa SAC"
              />
              <InputField
                label="Distrito"
                value={distrito}
                onChangeText={setDistrito}
                placeholder="Miraflores"
              />
              <Pressable
                disabled={isSubmitting}
                style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
                onPress={() => void handleSubmit()}>
                <ThemedText style={styles.primaryButtonText}>
                  {isSubmitting ? 'Creando...' : 'Crear empresa'}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        autoCapitalize="words"
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f8fc',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginBottom: 24,
    width: 44,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  description: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  form: {
    gap: 16,
    marginTop: 28,
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0b3b78',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 56,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.65,
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 30,
    padding: 20,
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  successTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 16,
  },
  successText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  codeBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  code: {
    color: '#0b3b78',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
