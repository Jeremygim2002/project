import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { SavePurchaseDto, PurchaseItemDto } from './dto/save-purchase.dto';
import { SavePurchaseResponseDto } from './dto/save-purchase-response.dto';
import {
  PurchaseDashboardDto,
  PurchaseDashboardRecordDto,
  PurchaseProviderMetricDto,
  PurchaseDashboardSummaryDto,
} from './dto/purchase-dashboard.dto';

type AuthenticatedUser = {
  uid: string;
  email: string;
  name: string;
  mypeId?: string | null;
};

type FactCompraRow = {
  transaccion_id: string;
  usuario_id: string;
  mype_id: string | null;
  sede_id: number | null;
  sede_nombre: string | null;
  ubicacion: string | null;
  proveedor_id: string;
  fecha_id: number;
  serie_comprobante: string | null;
  numero_comprobante: string | null;
  hash_duplicidad: string;
  item_descripcion: string | null;
  cantidad: number | null;
  unidad_medida: string | null;
  precio_unitario: number | null;
  op_gravada: number | null;
  igv: number | null;
  importe_total: number | null;
  tasa_detraccion_pct: number | null;
  monto_pago_detraccion: number | null;
  fecha_pago_detraccion: string | null;
  n_constancia_detraccion: string | null;
  confianza_ia: number | null;
  validacion_estado: string;
  validacion_errores: string | null;
  tipo_detraccion_id: string | null;
  tipo_detraccion_descripcion: string | null;
  estado_sunat: string | null;
  condicion_sunat: string | null;
};

type BigQueryNumericLike = {
  value: number | string | null;
};

type BigQueryStringifiableNumber = {
  toString: () => string;
};

type BigQueryNumberValue =
  | number
  | string
  | BigQueryNumericLike
  | BigQueryStringifiableNumber
  | null;

type DashboardRecordRow = {
  transaccion_id?: string;
  proveedor_id?: string;
  proveedor_nombre?: string | null;
  fecha_id?: BigQueryNumberValue;
  serie_comprobante?: string | null;
  numero_comprobante?: string | null;
  importe_total?: BigQueryNumberValue;
  monto_detraccion?: BigQueryNumberValue;
  validacion_estado?: string | null;
  validacion_errores?: string | null;
};

type DashboardSummaryRow = {
  total_mes?: BigQueryNumberValue;
  detraccion_pendiente?: BigQueryNumberValue;
  promedio_comprobante?: BigQueryNumberValue;
  comprobantes_mes?: BigQueryNumberValue;
  validados?: BigQueryNumberValue;
  observados?: BigQueryNumberValue;
};

type ProviderMetricRow = {
  proveedor_id?: string;
  proveedor_nombre?: string | null;
  total?: BigQueryNumberValue;
  comprobantes?: BigQueryNumberValue;
};

type BigQueryErrorDetail = {
  message?: string;
  reason?: string;
};

type BigQueryErrorLike = Error & {
  errors?: BigQueryErrorDetail[];
  response?: {
    insertErrors?: {
      errors?: BigQueryErrorDetail[];
    }[];
  };
};

@Injectable()
export class PurchasesService implements OnModuleInit {
  private readonly logger = new Logger(PurchasesService.name);
  private bigquery!: BigQuery;
  private projectId!: string;
  private datasetId!: string;
  private proveedorTable!: string;
  private comprasTable!: string;

  onModuleInit() {
    this.projectId = process.env.BIGQUERY_PROJECT_ID ?? 'fazil-11f23';
    this.datasetId = process.env.BIGQUERY_DATASET ?? 'fazil_bd';
    this.proveedorTable =
      process.env.BIGQUERY_PROVEEDOR_TABLE ?? 'dim_proveedor';
    this.comprasTable = process.env.BIGQUERY_COMPRAS_TABLE ?? 'fact_compras';
    this.bigquery = new BigQuery({ projectId: this.projectId });
  }

  async savePurchase(
    user: AuthenticatedUser,
    dto: SavePurchaseDto,
  ): Promise<SavePurchaseResponseDto> {
    const fechaId = this.toFechaId(dto.document.issueDate);

    if (!fechaId) {
      throw new BadRequestException('Fecha de emision invalida.');
    }

    const transactionId = dto.transactionId.trim();
    const proveedorId =
      this.normalizeRuc(dto.document.ruc) || `SIN_RUC_${transactionId}`;

    await this.mergeProveedor(proveedorId, dto);

    const rows = this.toFactRows({
      user,
      dto,
      transactionId,
      proveedorId,
      fechaId,
    });

    try {
      await this.bigquery
        .dataset(this.datasetId)
        .table(this.comprasTable)
        .insert(
          rows.map((row) => this.removeNullValues(row)),
          {
            ignoreUnknownValues: true,
          },
        );
    } catch (error) {
      const message = this.getBigQueryErrorMessage(error);
      this.logger.error(`No se pudo guardar compra en BigQuery: ${message}`);
      throw new ServiceUnavailableException(message);
    }

    return {
      transactionId,
      insertedRows: rows.length,
    };
  }

  async getDashboard(user: AuthenticatedUser): Promise<PurchaseDashboardDto> {
    const [summaryRows, recentRows, historyRows, providerRows] =
      await Promise.all([
        this.querySummary(user.uid),
        this.queryRecords(user.uid, 4),
        this.queryRecords(user.uid, 30),
        this.queryTopProviders(user.uid),
      ]);

    return {
      summary: this.toSummaryDto(summaryRows[0]),
      recent: recentRows.map((row) => this.toRecordDto(row)),
      history: historyRows.map((row) => this.toRecordDto(row)),
      topProviders: providerRows.map((row) => this.toProviderMetricDto(row)),
    };
  }

  private async mergeProveedor(proveedorId: string, dto: SavePurchaseDto) {
    const targetTable = `${this.projectId}.${this.datasetId}.${this.proveedorTable}`;
    const sunat = dto.document.sunat;
    const query = `
      MERGE \`${targetTable}\` T
      USING (
        SELECT
          @proveedorId AS proveedor_id,
          @nombreProveedor AS nombre_proveedor,
          @estadoSunat AS estado_sunat,
          @condicionSunat AS condicion_sunat
      ) S
      ON T.proveedor_id = S.proveedor_id
      WHEN MATCHED THEN
        UPDATE SET
          nombre_proveedor = S.nombre_proveedor,
          estado_sunat = S.estado_sunat,
          condicion_sunat = S.condicion_sunat
      WHEN NOT MATCHED THEN
        INSERT (proveedor_id, nombre_proveedor, estado_sunat, condicion_sunat)
        VALUES (S.proveedor_id, S.nombre_proveedor, S.estado_sunat, S.condicion_sunat)
    `;

    await this.bigquery.query({
      query,
      params: {
        proveedorId,
        nombreProveedor: sunat?.razonSocial ?? null,
        estadoSunat: sunat?.estado ?? null,
        condicionSunat: sunat?.condicion ?? null,
      },
      types: {
        proveedorId: 'STRING',
        nombreProveedor: 'STRING',
        estadoSunat: 'STRING',
        condicionSunat: 'STRING',
      },
    });
  }

  private async querySummary(
    usuarioId: string,
  ): Promise<DashboardSummaryRow[]> {
    const comprasTable = `${this.projectId}.${this.datasetId}.${this.comprasTable}`;
    const query = `
      WITH base AS (
        SELECT
          transaccion_id,
          MAX(fecha_id) AS fecha_id,
          MAX(COALESCE(op_gravada, 0)) AS op_gravada,
          MAX(COALESCE(igv, 0)) AS igv,
          SUM(COALESCE(importe_total, 0)) AS total_items,
          MAX(monto_pago_detraccion) AS monto_pago_detraccion,
          MAX(n_constancia_detraccion) AS n_constancia_detraccion,
          MAX(validacion_estado) AS validacion_estado
        FROM \`${comprasTable}\`
        WHERE usuario_id = @usuarioId
        GROUP BY transaccion_id
      ),
      tx AS (
        SELECT
          *,
          IF(op_gravada + igv > 0, op_gravada + igv, total_items) AS total_compra
        FROM base
      ),
      current_month AS (
        SELECT *
        FROM tx
        WHERE DIV(fecha_id, 100) = CAST(FORMAT_DATE('%Y%m', CURRENT_DATE('America/Lima')) AS INT64)
      )
      SELECT
        CAST(COALESCE(SUM(total_compra), 0) AS FLOAT64) AS total_mes,
        CAST(COALESCE(SUM(IF(n_constancia_detraccion IS NULL, COALESCE(monto_pago_detraccion, 0), 0)), 0) AS FLOAT64) AS detraccion_pendiente,
        CAST(COALESCE(AVG(total_compra), 0) AS FLOAT64) AS promedio_comprobante,
        COUNT(*) AS comprobantes_mes,
        COUNTIF(validacion_estado = 'success') AS validados,
        COUNTIF(validacion_estado != 'success') AS observados
      FROM current_month
    `;
    const [rows] = await this.bigquery.query({
      query,
      params: { usuarioId },
      types: { usuarioId: 'STRING' },
    });

    return rows as DashboardSummaryRow[];
  }

  private async queryRecords(
    usuarioId: string,
    limit: number,
  ): Promise<DashboardRecordRow[]> {
    const comprasTable = `${this.projectId}.${this.datasetId}.${this.comprasTable}`;
    const proveedorTable = `${this.projectId}.${this.datasetId}.${this.proveedorTable}`;
    const query = `
      WITH base AS (
        SELECT
          transaccion_id,
          MAX(proveedor_id) AS proveedor_id,
          MAX(fecha_id) AS fecha_id,
          MAX(serie_comprobante) AS serie_comprobante,
          MAX(numero_comprobante) AS numero_comprobante,
          MAX(COALESCE(op_gravada, 0)) AS op_gravada,
          MAX(COALESCE(igv, 0)) AS igv,
          SUM(COALESCE(importe_total, 0)) AS total_items,
          MAX(monto_pago_detraccion) AS monto_detraccion,
          MAX(validacion_estado) AS validacion_estado,
          MAX(validacion_errores) AS validacion_errores,
          MAX(fecha_carga) AS fecha_carga
        FROM \`${comprasTable}\`
        WHERE usuario_id = @usuarioId
        GROUP BY transaccion_id
      ),
      tx AS (
        SELECT
          *,
          IF(op_gravada + igv > 0, op_gravada + igv, total_items) AS total_compra
        FROM base
      )
      SELECT
        tx.transaccion_id,
        tx.proveedor_id,
        proveedor.nombre_proveedor AS proveedor_nombre,
        tx.fecha_id,
        tx.serie_comprobante,
        tx.numero_comprobante,
        CAST(tx.total_compra AS FLOAT64) AS importe_total,
        CAST(tx.monto_detraccion AS FLOAT64) AS monto_detraccion,
        tx.validacion_estado,
        tx.validacion_errores
      FROM tx
      LEFT JOIN \`${proveedorTable}\` proveedor
        ON proveedor.proveedor_id = tx.proveedor_id
      ORDER BY tx.fecha_carga DESC
      LIMIT @limit
    `;
    const [rows] = await this.bigquery.query({
      query,
      params: { usuarioId, limit },
      types: { usuarioId: 'STRING', limit: 'INT64' },
    });

    return rows as DashboardRecordRow[];
  }

  private async queryTopProviders(
    usuarioId: string,
  ): Promise<ProviderMetricRow[]> {
    const comprasTable = `${this.projectId}.${this.datasetId}.${this.comprasTable}`;
    const proveedorTable = `${this.projectId}.${this.datasetId}.${this.proveedorTable}`;
    const query = `
      WITH base AS (
        SELECT
          transaccion_id,
          MAX(proveedor_id) AS proveedor_id,
          MAX(COALESCE(op_gravada, 0)) AS op_gravada,
          MAX(COALESCE(igv, 0)) AS igv,
          SUM(COALESCE(importe_total, 0)) AS total_items
        FROM \`${comprasTable}\`
        WHERE usuario_id = @usuarioId
        GROUP BY transaccion_id
      ),
      tx AS (
        SELECT
          *,
          IF(op_gravada + igv > 0, op_gravada + igv, total_items) AS total_compra
        FROM base
      )
      SELECT
        tx.proveedor_id,
        proveedor.nombre_proveedor AS proveedor_nombre,
        CAST(COALESCE(SUM(tx.total_compra), 0) AS FLOAT64) AS total,
        COUNT(*) AS comprobantes
      FROM tx
      LEFT JOIN \`${proveedorTable}\` proveedor
        ON proveedor.proveedor_id = tx.proveedor_id
      GROUP BY tx.proveedor_id, proveedor.nombre_proveedor
      ORDER BY total DESC
      LIMIT 5
    `;
    const [rows] = await this.bigquery.query({
      query,
      params: { usuarioId },
      types: { usuarioId: 'STRING' },
    });

    return rows as ProviderMetricRow[];
  }

  private toFactRows({
    user,
    dto,
    transactionId,
    proveedorId,
    fechaId,
  }: {
    user: AuthenticatedUser;
    dto: SavePurchaseDto;
    transactionId: string;
    proveedorId: string;
    fechaId: number;
  }): FactCompraRow[] {
    const items =
      dto.items.length > 0 ? dto.items : [this.createSummaryItem(dto)];
    const { serie, numero } = this.splitInvoiceNumber(
      dto.document.invoiceNumber,
    );
    const hashDuplicidad = [this.normalizeRuc(dto.document.ruc), serie, numero]
      .filter(Boolean)
      .join('-');

    return items.map((item) => ({
      transaccion_id: transactionId,
      usuario_id: user.uid,
      mype_id: user.mypeId ?? null,
      sede_id: null,
      sede_nombre: this.emptyToNull(dto.document.sedeNombre),
      ubicacion: this.emptyToNull(dto.document.ubicacion),
      proveedor_id: proveedorId,
      fecha_id: fechaId,
      serie_comprobante: serie,
      numero_comprobante: numero,
      hash_duplicidad: hashDuplicidad || transactionId,
      item_descripcion: item.descripcion ?? null,
      cantidad: item.cantidad ?? null,
      unidad_medida: item.unidadMedida ?? null,
      precio_unitario: item.precioUnitario ?? null,
      op_gravada: dto.document.subtotal ?? null,
      igv: dto.document.igv ?? null,
      importe_total: item.importeTotal ?? dto.document.total ?? null,
      tasa_detraccion_pct: dto.document.detractionRate ?? null,
      monto_pago_detraccion: dto.document.detractionAmount ?? null,
      fecha_pago_detraccion: null,
      n_constancia_detraccion: null,
      confianza_ia: dto.confidence ?? null,
      validacion_estado: dto.status,
      validacion_errores:
        dto.reasons.length > 0 ? dto.reasons.join(' | ') : null,
      tipo_detraccion_id: dto.document.detractionTypeId ?? null,
      tipo_detraccion_descripcion: dto.document.detractionDescription ?? null,
      estado_sunat: dto.document.sunat?.estado ?? null,
      condicion_sunat: dto.document.sunat?.condicion ?? null,
    }));
  }

  private toSummaryDto(row?: DashboardSummaryRow): PurchaseDashboardSummaryDto {
    return {
      totalMes: this.toNumber(row?.total_mes),
      detraccionPendiente: this.toNumber(row?.detraccion_pendiente),
      promedioComprobante: this.toNumber(row?.promedio_comprobante),
      comprobantesMes: this.toNumber(row?.comprobantes_mes),
      validados: this.toNumber(row?.validados),
      observados: this.toNumber(row?.observados),
    };
  }

  private toRecordDto(row: DashboardRecordRow): PurchaseDashboardRecordDto {
    return {
      transactionId: row.transaccion_id ?? '',
      proveedorId: row.proveedor_id ?? '',
      proveedorNombre: row.proveedor_nombre ?? null,
      fechaId: this.toNumber(row.fecha_id),
      serieComprobante: row.serie_comprobante ?? null,
      numeroComprobante: row.numero_comprobante ?? null,
      importeTotal: this.toNumber(row.importe_total),
      montoDetraccion:
        row.monto_detraccion === null || row.monto_detraccion === undefined
          ? null
          : this.toNumber(row.monto_detraccion),
      validacionEstado: row.validacion_estado ?? 'error',
      validacionErrores: row.validacion_errores ?? null,
    };
  }

  private toProviderMetricDto(
    row: ProviderMetricRow,
  ): PurchaseProviderMetricDto {
    return {
      proveedorId: row.proveedor_id ?? '',
      proveedorNombre: row.proveedor_nombre ?? null,
      total: this.toNumber(row.total),
      comprobantes: this.toNumber(row.comprobantes),
    };
  }

  private createSummaryItem(dto: SavePurchaseDto): PurchaseItemDto {
    return {
      descripcion: 'Comprobante sin detalle de items',
      cantidad: 1,
      unidadMedida: 'UND',
      precioUnitario: dto.document.total ?? null,
      importeTotal: dto.document.total ?? null,
    };
  }

  private splitInvoiceNumber(value: string) {
    const [serie, ...numberParts] = value
      .split('-')
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      serie: serie ?? null,
      numero: numberParts.join('-') || null,
    };
  }

  private toFechaId(value: string) {
    const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (!match) {
      return null;
    }

    const [, day, month, year] = match;

    return Number(`${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`);
  }

  private normalizeRuc(value: string) {
    return value.replace(/\D/g, '');
  }

  private toNumber(value?: BigQueryNumberValue): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (this.isBigQueryNumericLike(value)) {
      return this.toNumber(value.value);
    }

    if (this.isBigQueryStringifiableNumber(value)) {
      const parsed = Number(value.toString());

      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }

  private isBigQueryNumericLike(value: unknown): value is BigQueryNumericLike {
    if (typeof value !== 'object' || value === null || !('value' in value)) {
      return false;
    }

    const rawValue = (value as { value?: unknown }).value;

    return (
      typeof rawValue === 'number' ||
      typeof rawValue === 'string' ||
      rawValue === null
    );
  }

  private isBigQueryStringifiableNumber(
    value: unknown,
  ): value is BigQueryStringifiableNumber {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const toString = (value as { toString?: unknown }).toString;

    if (typeof toString !== 'function') {
      return false;
    }

    const stringValue = toString.call(value);

    return stringValue !== '[object Object]' && Number.isFinite(Number(stringValue));
  }

  private emptyToNull(value?: string | null) {
    const trimmedValue = value?.trim();

    return trimmedValue || null;
  }

  private removeNullValues(row: FactCompraRow) {
    return Object.fromEntries(
      Object.entries(row).filter(([, value]) => value !== null),
    );
  }

  private getBigQueryErrorMessage(error: unknown) {
    if (error instanceof Error) {
      const detail = this.extractBigQueryErrorDetail(error);

      return detail ? `${error.message}: ${detail}` : error.message;
    }

    return String(error);
  }

  private extractBigQueryErrorDetail(error: Error) {
    const maybeError = error as BigQueryErrorLike;
    const directDetails = maybeError.errors?.map((item) =>
      this.formatBigQueryErrorDetail(item),
    );
    const insertDetails = maybeError.response?.insertErrors?.flatMap(
      (item) =>
        item.errors?.map((detail) => this.formatBigQueryErrorDetail(detail)) ??
        [],
    );
    const details = [...(directDetails ?? []), ...(insertDetails ?? [])].filter(
      (detail) => detail.length > 0,
    );

    return details.join(' | ');
  }

  private formatBigQueryErrorDetail(detail: BigQueryErrorDetail) {
    return [detail.reason, detail.message]
      .filter((value): value is string => Boolean(value))
      .join(': ');
  }
}
