import { getIdToken, signOut } from 'firebase/auth';

import { auth } from '../firebaseConfig';
import { api } from './api';
import { clearStoredSession, saveSession, type SessionRole } from './session';

export type MypeProfile = {
  mypeId: string;
  ruc: string;
  razonSocial: string | null;
  distrito: string | null;
  codigoInvitacion: string;
};

export type AuthUser = {
  uid: string;
  email: string;
  name: string;
  mypeId: string | null;
  rol: SessionRole | null;
  estadoRegistro: string | null;
  mype: MypeProfile | null;
};

type AuthUserResponse = {
  user: AuthUser;
};

export type RegisterAdminResponse = {
  user: AuthUser;
  mype: MypeProfile;
};

export type RegisterEmployeeResponse = RegisterAdminResponse;

export async function loginWithFirebaseToken(token: string) {
  const response = (await api.post('/auth/login', { token })) as {
    message: string;
    user: AuthUser;
  };

  await persistAuthenticatedUser(token, response.user);

  return response;
}

export async function getCurrentUserProfile() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return null;
  }

  const token = await getIdToken(currentUser);
  const response = (await api.get('/auth/me', token)) as AuthUserResponse;
  return response.user;
}

export function getFirstName(name?: string | null) {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName || 'Usuario';
}

export async function registerAdminCompany(input: {
  ruc: string;
  razonSocial: string;
  distrito: string;
}) {
  const token = await getCurrentFirebaseToken();
  const response = (await api.post('/auth/register-admin', input, token)) as RegisterAdminResponse;
  await persistAuthenticatedUser(token, response.user);
  return response;
}

export async function registerEmployeeWithInvitationCode(codigoInvitacion: string) {
  const token = await getCurrentFirebaseToken();
  const response = (await api.post(
    '/auth/register-employee',
    { codigoInvitacion },
    token,
  )) as RegisterEmployeeResponse;
  await persistAuthenticatedUser(token, response.user);
  return response;
}

export async function logout() {
  await clearStoredSession();
  await signOut(auth);
}

async function getCurrentFirebaseToken() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('Inicia sesion para continuar.');
  }

  return getIdToken(currentUser);
}

async function persistAuthenticatedUser(token: string, user: AuthUser) {
  await saveSession({
    token,
    role: user.rol,
    mypeId: user.mypeId,
    estadoRegistro: user.estadoRegistro,
  });
}
