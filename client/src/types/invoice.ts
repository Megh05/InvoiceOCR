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
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  vendor_name?: string;
  vendor_address?: string;
  bill_to?: string;
  ship_to?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  total?: number;
  line_items?: LineItem[];
  template_id?: string;
  category?: string;
}

export interface FieldConfidence {
  field: string;
  confidence: number;
  similarity_score?: number;
  extraction_method?: string;
}

export interface ParseResult {
  parsed: CanonicalInvoice;
  field_confidences: FieldConfidence[];
  raw_ocr_text: string;
  template_match?: TemplateMatch;
}

export interface TemplateMatch {
  template_id: string;
  template_name: string;
  confidence: number;
  matched_patterns: string[];
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  category: string;
  vendor_patterns: string[];
  field_patterns: Record<string, string[]>;
  layout_indicators: string[];
  confidence_threshold: number;
}

export interface WizardState {
  currentStep: number;
  uploadInput?: string;
  fileData?: File;
  ocrText?: string;
  parseResult?: ParseResult;
  editedInvoice?: CanonicalInvoice;
  savedInvoice?: any;
}