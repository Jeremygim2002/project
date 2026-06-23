// src/auth/auth.service.ts
import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterEmployeeDto } from './dto/register-employee.dto';

type UserRole = 'ADMIN' | 'USER';

type AuthUserRecord = {
  usuario_id: string;
  nombre_completo: string | null;
  correo_electronico: string | null;
  mype_id: string | null;
  rol: UserRole | null;
  estado_registro: string | null;
};

type MypeRecord = {
  mype_id: string;
  ruc_mype: string;
  razon_social: string | null;
  distrito: string | null;
  codigo_invitacion: string;
  estado_registro: string | null;
};

export type CompanyProfile = {
  mypeId: string;
  ruc: string;
  razonSocial: string | null;
  distrito: string | null;
  codigoInvitacion: string;
};

export type AuthUserProfile = {
  uid: string;
  email: string;
  name: string;
  mypeId: string | null;
  rol: UserRole | null;
  estadoRegistro: string | null;
  mype: CompanyProfile | null;
};

export type AdminRegistrationResult = {
  user: AuthUserProfile;
  mype: CompanyProfile;
};

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private bigquery!: BigQuery;
  private projectId!: string;
  private datasetId!: string;
  private userTable!: string;
  private mypeTable!: string;

  onModuleInit() {
    if (!getApps().length) {
      initializeApp({
        credential: applicationDefault(),
      });
    }

    this.projectId = process.env.BIGQUERY_PROJECT_ID ?? 'fazil-11f23';
    this.datasetId = process.env.BIGQUERY_DATASET ?? 'fazil_bd';
    this.userTable = process.env.BIGQUERY_USER_TABLE ?? 'dim_usuario';
    this.mypeTable = process.env.BIGQUERY_MYPE_TABLE ?? 'dim_mype';
    this.bigquery = new BigQuery({ projectId: this.projectId });
  }

  async verifyTokenAndSaveUser(clientToken: string): Promise<AuthUserProfile> {
    const firebaseUser = await this.verifyFirebaseToken(clientToken);

    try {
      const user = await this.ensureUser({
        uid: firebaseUser.uid,
        nombre: firebaseUser.name,
        correo: firebaseUser.email,
      });
      const mype = user.mype_id ? await this.findMypeById(user.mype_id) : null;

      return this.toAuthUserProfile(firebaseUser, user, mype);
    } catch (error: unknown) {
      this.logger.warn(
        `No se pudo guardar usuario en BigQuery: ${String(error)}`,
      );

      return {
        ...firebaseUser,
        mypeId: null,
        rol: null,
        estadoRegistro: null,
        mype: null,
      };
    }
  }

  async getUserProfile(clientToken: string): Promise<AuthUserProfile> {
    const firebaseUser = await this.verifyFirebaseToken(clientToken);
    const user = await this.findUserById(firebaseUser.uid);
    const mype = user?.mype_id ? await this.findMypeById(user.mype_id) : null;

    return this.toAuthUserProfile(firebaseUser, user, mype);
  }

  async registerAdmin(
    clientToken: string,
    dto: RegisterAdminDto,
  ): Promise<AdminRegistrationResult> {
    const firebaseUser = await this.verifyFirebaseToken(clientToken);
    const ruc = this.normalizeRuc(dto.ruc);
    const existingMype = await this.findMypeByRuc(ruc);

    if (existingMype) {
      throw new ConflictException('El RUC ya esta registrado.');
    }

    const mypeId = `MYPE_${ruc}`;
    const codigoInvitacion = await this.generateUniqueInvitationCode();
    const mype = await this.insertMype({
      mypeId,
      ruc,
      razonSocial: dto.razonSocial.trim(),
      distrito: dto.distrito.trim(),
      codigoInvitacion,
    });
    const user = await this.assignUserToMype({
      uid: firebaseUser.uid,
      nombre: firebaseUser.name,
      correo: firebaseUser.email,
      mypeId: mype.mype_id,
      rol: 'ADMIN',
    });

    return {
      user: this.toAuthUserProfile(firebaseUser, user, mype),
      mype: this.toMypeResponse(mype),
    };
  }

  async registerEmployee(
    clientToken: string,
    dto: RegisterEmployeeDto,
  ): Promise<{ user: AuthUserProfile; mype: AdminRegistrationResult['mype'] }> {
    const firebaseUser = await this.verifyFirebaseToken(clientToken);
    const codigoInvitacion = dto.codigoInvitacion.trim().toUpperCase();
    const mype = await this.findMypeByInvitationCode(codigoInvitacion);

    if (!mype) {
      throw new NotFoundException('Codigo de invitacion invalido.');
    }

    const user = await this.assignUserToMype({
      uid: firebaseUser.uid,
      nombre: firebaseUser.name,
      correo: firebaseUser.email,
      mypeId: mype.mype_id,
      rol: 'USER',
    });

    return {
      user: this.toAuthUserProfile(firebaseUser, user, mype),
      mype: this.toMypeResponse(mype),
    };
  }

  private async ensureUser(params: {
    uid: string;
    nombre: string;
    correo: string;
  }): Promise<AuthUserRecord> {
    const query = `
      MERGE \`${this.getUserTable()}\` T
      USING (
        SELECT
          @uid AS usuario_id,
          @nombre AS nombre_completo,
          @correo AS correo_electronico
      ) S
      ON T.usuario_id = S.usuario_id
      WHEN MATCHED THEN
        UPDATE SET
          nombre_completo = COALESCE(NULLIF(S.nombre_completo, ''), T.nombre_completo),
          correo_electronico = COALESCE(NULLIF(S.correo_electronico, ''), T.correo_electronico)
      WHEN NOT MATCHED THEN
        INSERT (
          usuario_id,
          nombre_completo,
          correo_electronico,
          estado_registro,
          fecha_creacion
        )
        VALUES (
          S.usuario_id,
          S.nombre_completo,
          S.correo_electronico,
          'PENDIENTE',
          CURRENT_TIMESTAMP()
        )
    `;

    await this.bigquery.query({
      query,
      params,
      types: {
        uid: 'STRING',
        nombre: 'STRING',
        correo: 'STRING',
      },
    });

    return this.findUserById(params.uid) as Promise<AuthUserRecord>;
  }

  private async findUserById(uid: string): Promise<AuthUserRecord | null> {
    const query = `
      SELECT
        usuario_id,
        nombre_completo,
        correo_electronico,
        mype_id,
        rol,
        estado_registro
      FROM \`${this.getUserTable()}\`
      WHERE usuario_id = @uid
      LIMIT 1
    `;

    const [rows] = await this.bigquery.query({
      query,
      params: { uid },
      types: { uid: 'STRING' },
    });

    return (rows[0] as AuthUserRecord | undefined) ?? null;
  }

  private async findMypeByRuc(ruc: string): Promise<MypeRecord | null> {
    const query = `
      SELECT
        mype_id,
        ruc_mype,
        razon_social,
        distrito,
        codigo_invitacion,
        estado_registro
      FROM \`${this.getMypeTable()}\`
      WHERE ruc_mype = @ruc
      LIMIT 1
    `;

    const [rows] = await this.bigquery.query({
      query,
      params: { ruc },
      types: { ruc: 'STRING' },
    });

    return (rows[0] as MypeRecord | undefined) ?? null;
  }

  private async findMypeById(mypeId: string): Promise<MypeRecord | null> {
    const query = `
      SELECT
        mype_id,
        ruc_mype,
        razon_social,
        distrito,
        codigo_invitacion,
        estado_registro
      FROM \`${this.getMypeTable()}\`
      WHERE mype_id = @mypeId
      LIMIT 1
    `;

    const [rows] = await this.bigquery.query({
      query,
      params: { mypeId },
      types: { mypeId: 'STRING' },
    });

    return (rows[0] as MypeRecord | undefined) ?? null;
  }

  private async findMypeByInvitationCode(
    codigoInvitacion: string,
  ): Promise<MypeRecord | null> {
    const query = `
      SELECT
        mype_id,
        ruc_mype,
        razon_social,
        distrito,
        codigo_invitacion,
        estado_registro
      FROM \`${this.getMypeTable()}\`
      WHERE codigo_invitacion = @codigoInvitacion
        AND COALESCE(estado_registro, 'ACTIVO') = 'ACTIVO'
      LIMIT 1
    `;

    const [rows] = await this.bigquery.query({
      query,
      params: { codigoInvitacion },
      types: { codigoInvitacion: 'STRING' },
    });

    return (rows[0] as MypeRecord | undefined) ?? null;
  }

  private async invitationCodeExists(codigoInvitacion: string) {
    const query = `
      SELECT 1 AS exists_flag
      FROM \`${this.getMypeTable()}\`
      WHERE codigo_invitacion = @codigoInvitacion
      LIMIT 1
    `;

    const [rows] = await this.bigquery.query({
      query,
      params: { codigoInvitacion },
      types: { codigoInvitacion: 'STRING' },
    });

    return rows.length > 0;
  }

  private async insertMype(params: {
    mypeId: string;
    ruc: string;
    razonSocial: string;
    distrito: string;
    codigoInvitacion: string;
  }): Promise<MypeRecord> {
    const query = `
      INSERT INTO \`${this.getMypeTable()}\` (
        mype_id,
        ruc_mype,
        razon_social,
        distrito,
        codigo_invitacion,
        estado_registro,
        fecha_creacion
      )
      VALUES (
        @mypeId,
        @ruc,
        @razonSocial,
        @distrito,
        @codigoInvitacion,
        'ACTIVO',
        CURRENT_TIMESTAMP()
      )
    `;

    await this.bigquery.query({
      query,
      params,
      types: {
        mypeId: 'STRING',
        ruc: 'STRING',
        razonSocial: 'STRING',
        distrito: 'STRING',
        codigoInvitacion: 'STRING',
      },
    });

    return {
      mype_id: params.mypeId,
      ruc_mype: params.ruc,
      razon_social: params.razonSocial,
      distrito: params.distrito,
      codigo_invitacion: params.codigoInvitacion,
      estado_registro: 'ACTIVO',
    };
  }

  private async assignUserToMype(params: {
    uid: string;
    nombre: string;
    correo: string;
    mypeId: string;
    rol: UserRole;
  }): Promise<AuthUserRecord> {
    const query = `
      MERGE \`${this.getUserTable()}\` T
      USING (
        SELECT
          @uid AS usuario_id,
          @nombre AS nombre_completo,
          @correo AS correo_electronico,
          @mypeId AS mype_id,
          @rol AS rol
      ) S
      ON T.usuario_id = S.usuario_id
      WHEN MATCHED THEN
        UPDATE SET
          nombre_completo = COALESCE(NULLIF(S.nombre_completo, ''), T.nombre_completo),
          correo_electronico = COALESCE(NULLIF(S.correo_electronico, ''), T.correo_electronico),
          mype_id = S.mype_id,
          rol = S.rol,
          estado_registro = 'ACTIVO'
      WHEN NOT MATCHED THEN
        INSERT (
          usuario_id,
          nombre_completo,
          correo_electronico,
          mype_id,
          rol,
          estado_registro,
          fecha_creacion
        )
        VALUES (
          S.usuario_id,
          S.nombre_completo,
          S.correo_electronico,
          S.mype_id,
          S.rol,
          'ACTIVO',
          CURRENT_TIMESTAMP()
        )
    `;

    await this.bigquery.query({
      query,
      params,
      types: {
        uid: 'STRING',
        nombre: 'STRING',
        correo: 'STRING',
        mypeId: 'STRING',
        rol: 'STRING',
      },
    });

    return this.findUserById(params.uid) as Promise<AuthUserRecord>;
  }

  private async verifyFirebaseToken(
    clientToken: string,
  ): Promise<
    Omit<AuthUserProfile, 'mypeId' | 'rol' | 'estadoRegistro' | 'mype'>
  > {
    let decodedToken: DecodedIdToken;

    try {
      decodedToken = await getAuth().verifyIdToken(clientToken);
    } catch (error: unknown) {
      throw new UnauthorizedException(`Token invalido: ${String(error)}`);
    }

    const uid = String(decodedToken.uid);
    const email =
      typeof decodedToken.email === 'string' ? decodedToken.email : '';
    const name =
      typeof decodedToken.name === 'string' ? decodedToken.name : 'Usuario';

    return { uid, email, name };
  }

  private toAuthUserProfile(
    firebaseUser: Omit<
      AuthUserProfile,
      'mypeId' | 'rol' | 'estadoRegistro' | 'mype'
    >,
    user:
      | {
          mype_id: string | null;
          rol: UserRole | null;
          estado_registro: string | null;
        }
      | null,
    mype: MypeRecord | null,
  ): AuthUserProfile {
    return {
      ...firebaseUser,
      mypeId: user?.mype_id ?? null,
      rol: user?.rol ?? null,
      estadoRegistro: user?.estado_registro ?? null,
      mype: mype ? this.toMypeResponse(mype) : null,
    };
  }

  private toMypeResponse(mype: MypeRecord): CompanyProfile {
    return {
      mypeId: mype.mype_id,
      ruc: mype.ruc_mype,
      razonSocial: mype.razon_social,
      distrito: mype.distrito,
      codigoInvitacion: mype.codigo_invitacion,
    };
  }

  private normalizeRuc(value: string) {
    return value.replace(/\D/g, '');
  }

  private async generateUniqueInvitationCode() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = this.generateInvitationCode();
      const exists = await this.invitationCodeExists(code);

      if (!exists) {
        return code;
      }
    }

    throw new ConflictException(
      'No se pudo generar un codigo unico. Intenta nuevamente.',
    );
  }

  private generateInvitationCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let index = 0; index < 6; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    return code;
  }

  private getUserTable() {
    return `${this.projectId}.${this.datasetId}.${this.userTable}`;
  }

  private getMypeTable() {
    return `${this.projectId}.${this.datasetId}.${this.mypeTable}`;
  }
}
