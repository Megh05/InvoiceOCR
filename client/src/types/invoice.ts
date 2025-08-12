export interface ParseRequest {
  image_url?: string;
  image_base64?: string;
  ocr_text?: string;
}

export interface LineItem {
  line_number: number;
  sku: string | null;
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
  tax: number;
}

export interface CanonicalInvoice {
  invoice_number: string | null;
  invoice_date: string | null;
  vendor_name: string | null;
  vendor_address: string | null;
  bill_to: string | null;
  ship_to: string | null;
  currency: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  line_items: LineItem[];
  raw_ocr_text: string;
  mistral_ocr_text: string;
  ocr_similarity_score: number;
}

export interface FieldConfidence {
  field: string;
  value: any;
  confidence: number;
  source: string;
}

export interface ParseResult {
  parsed: CanonicalInvoice;
  confidence: number;
  raw_ocr_text: string;
  mistral_ocr_text: string;
  ocr_similarity_score: number;
  fallback_used: boolean;
  action?: string;
  field_confidences: FieldConfidence[];
}

export interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  vendor_name: string | null;
  vendor_address: string | null;
  bill_to: string | null;
  ship_to: string | null;
  currency: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  raw_ocr_text: string;
  mistral_ocr_text: string;
  ocr_similarity_score: number;
  confidence: number;
  created_at: string;
  updated_at: string;
  line_items?: LineItem[];
}

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface WizardState {
  step: WizardStep;
  inputType: 'file' | 'url' | 'text' | null;
  imageFile: File | null;
  imageUrl: string;
  ocrText: string;
  parseResult: ParseResult | null;
  editedInvoice: CanonicalInvoice | null;
  savedInvoice: Invoice | null;
  isProcessing: boolean;
  error: string | null;
}
