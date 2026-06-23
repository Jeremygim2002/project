import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';

export default function CompanyChoiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TextBadge label="Fazil" />
          <ThemedText style={styles.title}>Configura tu empresa</ThemedText>
          <ThemedText style={styles.description}>
            Elige como quieres asociar tu cuenta para empezar a registrar comprobantes.
          </ThemedText>
        </View>

        <View style={styles.options}>
          <RouteOption
            icon="business-outline"
            title="Crear nueva empresa"
            description="Registra tu MYPE y genera un codigo para invitar a tu equipo."
            onPress={() => router.push('/(auth)/register-company' as never)}
          />
          <RouteOption
            icon="key-outline"
            title="Unirse a una empresa existente"
            description="Ingresa el codigo de invitacion que te compartio un administrador."
            onPress={() => router.push('/(auth)/join-company' as never)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RouteOption({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" style={styles.option} onPress={onPress}>
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={24} color="#0b3b78" />
      </View>
      <View style={styles.optionBody}>
        <ThemedText style={styles.optionTitle}>{title}</ThemedText>
        <ThemedText style={styles.optionDescription}>{description}</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </Pressable>
  );
}

function TextBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <ThemedText style={styles.badgeText}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f8fc',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#eaf2ff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 16,
  },
  badgeText: {
    color: '#0b3b78',
    fontSize: 13,
    fontWeight: '900',
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'center',
  },
  description: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  options: {
    gap: 14,
  },
  option: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 112,
    padding: 16,
  },
  optionIcon: {
    alignItems: 'center',
    backgroundColor: '#eaf2ff',
    borderRadius: 16,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  optionBody: {
    flex: 1,
    gap: 5,
  },
  optionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  optionDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
});
