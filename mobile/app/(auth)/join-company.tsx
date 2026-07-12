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
import { registerEmployeeWithInvitationCode } from '@/services/auth';

export default function JoinCompanyScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const normalizedCode = code.trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      Alert.alert('Codigo invalido', 'Ingresa un codigo alfanumerico de 6 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      await registerEmployeeWithInvitationCode(normalizedCode);
      router.replace('/(tabs)' as never);
    } catch (error: unknown) {
      Alert.alert('No se pudo unir a la empresa', String(error));
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

          <View style={styles.iconFrame}>
            <Ionicons name="key-outline" size={32} color="#0b3b78" />
          </View>
          <ThemedText style={styles.title}>Unirse a una empresa</ThemedText>
          <ThemedText style={styles.description}>
            Pide a tu administrador el codigo de invitacion y activa tu cuenta como empleado.
          </ThemedText>

          <View style={styles.form}>
            <ThemedText style={styles.fieldLabel}>Codigo de invitacion</ThemedText>
            <TextInput
              autoCapitalize="characters"
              maxLength={6}
              onChangeText={(value) => setCode(value.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={code}
            />
            <Pressable
              disabled={isSubmitting}
              style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
              onPress={() => void handleSubmit()}>
              <ThemedText style={styles.primaryButtonText}>
                {isSubmitting ? 'Validando...' : 'Unirme'}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    marginBottom: 26,
    width: 44,
  },
  iconFrame: {
    alignItems: 'center',
    backgroundColor: '#eaf2ff',
    borderRadius: 24,
    height: 76,
    justifyContent: 'center',
    marginBottom: 18,
    width: 76,
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
    gap: 10,
    marginTop: 30,
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
    minHeight: 62,
    paddingHorizontal: 16,
    textAlign: 'center',
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
});
