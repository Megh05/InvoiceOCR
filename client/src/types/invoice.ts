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

export interface ValidationError {
  field: string;
  error: string;
  severity: 'critical' | 'major' | 'minor';
  suggested_fix?: string;
}

export interface ValidationWarning {
  field: string;
  warning: string;
  confidence_impact: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidence_adjustments: any[];
}

export interface ParseResult {
  parsed: CanonicalInvoice;
  confidence: number;
  field_confidences: FieldConfidence[];
  raw_ocr_text: string;
  mistral_ocr_text: string;
  ocr_similarity_score: number;
  fallback_used: boolean;
  llm_enhanced?: boolean;
  action?: string;
  template_match?: TemplateMatch;
  validation_results?: ValidationResult;
  improvements?: string[];
  extraction_details?: any;
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
  step: number;
  inputType?: 'file' | 'url' | 'text' | null;
  imageFile?: File | null;
  imageUrl?: string;
  ocrText?: string;
  parseResult?: ParseResult | null;
  editedInvoice?: CanonicalInvoice | null;
  savedInvoice?: any | null;
  isProcessing?: boolean;
  error?: string | null;
}