import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { setPendingGoogleAuthSession } from '../../services/googleAuthSession';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const redirectUri = makeRedirectUri({
    native: 'fazil:/oauthredirect',
    scheme: 'fazil',
    path: 'oauthredirect',
  });

  const [request, , promptAsync] = Google.useAuthRequest({
    clientId:
      process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ??
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    scopes: ['profile', 'email'],
  });

  const handleGoogleSignIn = async () => {
    if (!request || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      if (!androidClientId || !request.codeVerifier || !request.state) {
        throw new Error('La sesion de Google no esta lista. Intenta otra vez.');
      }

      setPendingGoogleAuthSession({
        clientId: androidClientId,
        codeVerifier: request.codeVerifier,
        redirectUri,
        scopes: request.scopes,
        state: request.state,
      });

      const authResponse = await promptAsync({ showInRecents: true });
      if (authResponse.type === 'cancel' || authResponse.type === 'dismiss') {
        setIsSubmitting(false);
      }
    } catch (error: unknown) {
      Alert.alert('Error de autenticacion', String(error));
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        <View style={styles.backgroundGlowTop} />
        <View style={styles.backgroundGlowBottom} />

        <View style={styles.header}>
          <Text style={styles.brand}>Fazil</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.logoFrame}>
            <View style={styles.logoTile}>
              <Text style={styles.logoLetter}>F</Text>
              <View style={styles.logoPulse} />
            </View>
          </View>

          <Text style={styles.title}>Inicia sesión</Text>
          <Text style={styles.description}>
            Accede con Google para empezar a sincronizar y revisar tus comprobantes de compra
          </Text>
        </View>

        <Pressable
          style={[styles.googleButton, isSubmitting && styles.googleButtonDisabled]}
          accessibilityRole="button"
          disabled={!request || isSubmitting}
          onPress={() => void handleGoogleSignIn()}>
          <View style={styles.googleIcon}>
            <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
              <Path
                d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
                fill="#4285F4"
              />
              <Path
                d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2118 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9827 5.48182 18 9 18Z"
                fill="#34A853"
              />
              <Path
                d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z"
                fill="#FBBC05"
              />
              <Path
                d="M9 3.57955C10.3227 3.57955 11.5105 4.03455 12.4445 4.92682L15.0218 2.34955C13.4632 0.897273 11.4259 0 9 0C5.48182 0 2.43818 2.01727 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
                fill="#EA4335"
              />
            </Svg>
          </View>
          <Text style={styles.googleButtonText}>
            {isSubmitting ? 'Conectando...' : 'Continuar con Google'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f8fc',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: '#dbeafe',
    opacity: 0.7,
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -100,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: '#e0e7ff',
    opacity: 0.5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brand: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#667085',
    textAlign: 'center',
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 32,
    paddingVertical: 28,
    paddingHorizontal: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  logoFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 28,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoTile: {
    width: '72%',
    aspectRatio: 1,
    borderRadius: 42,
    backgroundColor: '#0b3b78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: -6,
  },
  logoPulse: {
    position: 'absolute',
    bottom: 28,
    right: 26,
    width: 34,
    height: 34,
    borderRadius: 34,
    backgroundColor: '#4ade80',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  description: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: '#6b7280',
    textAlign: 'center',
  },
  googleButton: {
    marginTop: 28,
    minHeight: 62,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  googleIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  footerBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4b5563',
  },
  footerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
    fontWeight: '500',
  },
});
