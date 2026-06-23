import { type ExtractedInvoiceDocument } from '@/services/documents';
import { type RucConsultation } from '@/services/sunat';

export type PurchaseValidationStatus = 'success' | 'error';

export type PurchaseDocumentDraft = {
  ruc: string;
  invoiceNumber: string;
  issueDate: string;
  sedeNombre: string;
  ubicacion: string;
  subtotal: number | null;
  igv: number | null;
  total: number | null;
  detractionRate: number | null;
  detractionAmount: number | null;
  detractionTypeId: string | null;
  detractionDescription: string | null;
  sunat: RucConsultation | null;
};

export type PendingPurchaseValidation = {
  sourceDocumentId: number | null;
  transactionId: string;
  status: PurchaseValidationStatus;
  reasons: string[];
  document: PurchaseDocumentDraft;
  items: ExtractedInvoiceDocument['items'];
  confidence: number | null;
};

type PendingExtractedDocumentSnapshot = {
  id: number;
  document: ExtractedInvoiceDocument;
};

let pendingExtractedDocument: PendingExtractedDocumentSnapshot | null = null;
let pendingExtractedDocumentId = 0;
let pendingPurchaseValidation: PendingPurchaseValidation | null = null;

export function setPendingExtractedDocument(document: ExtractedInvoiceDocument) {
  pendingExtractedDocumentId += 1;
  pendingExtractedDocument = {
    id: pendingExtractedDocumentId,
    document,
  };
}

export function getPendingExtractedDocument() {
  return pendingExtractedDocument?.document ?? null;
}

export function getPendingExtractedDocumentSnapshot() {
  return pendingExtractedDocument;
}

export function clearPendingExtractedDocument() {
  pendingExtractedDocument = null;
  pendingExtractedDocumentId += 1;
}

export function setPendingPurchaseValidation(validation: PendingPurchaseValidation) {
  pendingPurchaseValidation = validation;
}

export function getPendingPurchaseValidation() {
  return pendingPurchaseValidation;
}

export function clearPendingPurchaseValidation() {
  pendingPurchaseValidation = null;
}

export function clearPendingScannerFlow() {
  pendingExtractedDocument = null;
  pendingExtractedDocumentId += 1;
  pendingPurchaseValidation = null;
}

export function createPurchaseTransactionId() {
  return `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function clonePurchaseValidationWithNewTransaction(validation: PendingPurchaseValidation): PendingPurchaseValidation {
  return {
    ...validation,
    transactionId: createPurchaseTransactionId(),
  };
}
