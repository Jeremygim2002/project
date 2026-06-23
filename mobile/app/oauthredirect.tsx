import { exchangeCodeAsync } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GoogleAuthProvider, getIdToken, signInWithCredential } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../firebaseConfig';
import { loginWithFirebaseToken } from '../services/auth';
import {
  clearPendingGoogleAuthSession,
  getPendingGoogleAuthSession,
} from '../services/googleAuthSession';

export default function OAuthRedirectScreen() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    state?: string;
  }>();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) {
      return;
    }

    didRun.current = true;

    const completeLogin = async () => {
      const pendingSession = getPendingGoogleAuthSession();

      if (!pendingSession) {
        setErrorMessage('La sesion de Google expiro. Vuelve a iniciar sesion.');
        return;
      }

      if (params.error) {
        clearPendingGoogleAuthSession();
        setErrorMessage(String(params.error));
        return;
      }

      if (!params.code || params.state !== pendingSession.state) {
        clearPendingGoogleAuthSession();
        setErrorMessage('No se pudo validar la respuesta de Google.');
        return;
      }

      try {
        const tokenResponse = await exchangeCodeAsync(
          {
            clientId: pendingSession.clientId,
            code: params.code,
            extraParams: {
              code_verifier: pendingSession.codeVerifier,
            },
            redirectUri: pendingSession.redirectUri,
            scopes: pendingSession.scopes,
          },
          Google.discovery,
        );

        if (!tokenResponse.idToken) {
          throw new Error('No se recibio el token de Google.');
        }

        const credential = GoogleAuthProvider.credential(
          tokenResponse.idToken,
          tokenResponse.accessToken,
        );
        const userCredential = await signInWithCredential(auth, credential);
        const firebaseIdToken = await getIdToken(userCredential.user);
        const loginResponse = await loginWithFirebaseToken(firebaseIdToken);

        clearPendingGoogleAuthSession();
        if (loginResponse.user.mypeId && loginResponse.user.rol) {
          router.replace('/(tabs)' as never);
        } else {
          router.replace('/(auth)/company-choice' as never);
        }
      } catch (error: unknown) {
        clearPendingGoogleAuthSession();
        setErrorMessage(String(error));
      }
    };

    void completeLogin();
  }, [params.code, params.error, params.state, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {errorMessage ? (
          <>
            <Text style={styles.title}>No se pudo completar el login</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.button}
              onPress={() => router.replace('/(auth)/login' as never)}>
              <Text style={styles.buttonText}>Intentar de nuevo</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color="#0b3b78" size="large" />
            <Text style={styles.text}>Conectando...</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f8fc',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  text: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    textAlign: 'center',
  },
  errorText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    maxWidth: 320,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#0b3b78',
    borderRadius: 14,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 54,
    paddingHorizontal: 24,
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
});
