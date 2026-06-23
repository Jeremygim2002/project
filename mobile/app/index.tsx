import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getStoredSession, isProfileComplete } from '@/services/session';

export default function HomeScreen() {
  const router = useRouter();

  useEffect(() => {
    const redirectToInitialRoute = async () => {
      const session = await getStoredSession();
      const nextRoute = isProfileComplete(session) ? '/(tabs)' : '/(auth)/login';
      router.replace(nextRoute as never);
    };

    void redirectToInitialRoute();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#0b3b78" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f6f8fc',
    flex: 1,
    justifyContent: 'center',
  },
});
