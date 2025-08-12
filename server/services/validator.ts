import { CanonicalInvoice } from "@shared/schema";

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidence_adjustments: ConfidenceAdjustment[];
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
  confidence_impact: number; // -0.1 to -0.5
}

export interface ConfidenceAdjustment {
  field: string;
  original_confidence: number;
  adjusted_confidence: number;
  reason: string;
}

/**
 * Hybrid Validation System
 * Implements business rules and cross-field validation
 * to catch logical errors and improve data quality
 */
export class InvoiceValidatorService {
  private tolerancePercent = 0.02; // 2% tolerance for rounding

  /**
   * Comprehensive validation of invoice data
   * Checks business rules, mathematical consistency, and data quality
   */
  validateInvoice(invoice: CanonicalInvoice): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const adjustments: ConfidenceAdjustment[] = [];

    // 1. Mathematical validation
    this.validateMath(invoice, errors, warnings);
    
    // 2. Date validation
    this.validateDates(invoice, errors, warnings);
    
    // 3. Field completeness validation
    this.validateCompleteness(invoice, errors, warnings);
    
    // 4. Data format validation
    this.validateFormats(invoice, errors, warnings);
    
    // 5. Business logic validation
    this.validateBusinessRules(invoice, errors, warnings);
    
    // 6. Line items validation
    this.validateLineItems(invoice, errors, warnings);

    const isValid = errors.filter(e => e.severity === 'critical').length === 0;

    return {
      isValid,
      errors,
      warnings,
      confidence_adjustments: adjustments
    };
  }

  private validateMath(invoice: CanonicalInvoice, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Check if line items sum matches subtotal
    if (invoice.line_items && invoice.line_items.length > 0) {
      const lineItemsTotal = invoice.line_items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const subtotalDiff = Math.abs(lineItemsTotal - (invoice.subtotal || 0));
      
      if (subtotalDiff > lineItemsTotal * this.tolerancePercent) {
        errors.push({
          field: 'subtotal',
          error: `Subtotal (${invoice.subtotal}) doesn't match line items total (${lineItemsTotal})`,
          severity: 'major',
          suggested_fix: `Set subtotal to ${lineItemsTotal.toFixed(2)}`
        });
      }
    }

    // Check if total = subtotal + tax + shipping
    const calculatedTotal = (invoice.subtotal || 0) + (invoice.tax || 0) + (invoice.shipping || 0);
    const totalDiff = Math.abs(calculatedTotal - (invoice.total || 0));
    
    if (totalDiff > calculatedTotal * this.tolerancePercent) {
      errors.push({
        field: 'total',
        error: `Total (${invoice.total}) doesn't match subtotal + tax + shipping (${calculatedTotal})`,
        severity: 'major',
        suggested_fix: `Set total to ${calculatedTotal.toFixed(2)}`
      });
    }

    // Validate line item calculations
    invoice.line_items?.forEach((item, index) => {
      const calculatedAmount = (item.qty || 1) * (item.unit_price || 0);
      const amountDiff = Math.abs(calculatedAmount - (item.amount || 0));
      
      if (amountDiff > calculatedAmount * this.tolerancePercent && calculatedAmount > 0) {
        warnings.push({
          field: `line_items[${index}].amount`,
          warning: `Line item amount may be incorrect: ${item.amount} vs calculated ${calculatedAmount}`,
          confidence_impact: -0.2
        });
      }
    });
  }

  private validateDates(invoice: CanonicalInvoice, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (invoice.invoice_date) {
      // Check date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(invoice.invoice_date)) {
        errors.push({
          field: 'invoice_date',
          error: `Invalid date format: ${invoice.invoice_date}. Expected YYYY-MM-DD`,
          severity: 'minor',
          suggested_fix: 'Convert to YYYY-MM-DD format'
        });
      } else {
        // Check if date is reasonable (not too far in past/future)
        const invoiceDate = new Date(invoice.invoice_date);
        const now = new Date();
        const yearsDiff = Math.abs(now.getFullYear() - invoiceDate.getFullYear());
        
        if (yearsDiff > 10) {
          warnings.push({
            field: 'invoice_date',
            warning: `Invoice date seems unusual: ${invoice.invoice_date}`,
            confidence_impact: -0.1
          });
        }
      }
    }
  }

  private validateCompleteness(invoice: CanonicalInvoice, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Critical fields that should be present
    const criticalFields = ['total'];
    const importantFields = ['vendor_name', 'invoice_date'];

    criticalFields.forEach(field => {
      const value = invoice[field as keyof CanonicalInvoice];
      if (!value || (typeof value === 'number' && value <= 0)) {
        errors.push({
          field,
          error: `Missing critical field: ${field}`,
          severity: 'critical'
        });
      }
    });

    importantFields.forEach(field => {
      const value = invoice[field as keyof CanonicalInvoice];
      if (!value) {
        warnings.push({
          field,
          warning: `Missing important field: ${field}`,
          confidence_impact: -0.1
        });
      }
    });
  }

  private validateFormats(invoice: CanonicalInvoice, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate currency format
    if (invoice.currency) {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
      if (!validCurrencies.includes(invoice.currency.toUpperCase())) {
        warnings.push({
          field: 'currency',
          warning: `Unusual currency code: ${invoice.currency}`,
          confidence_impact: -0.05
        });
      }
    }

    // Validate amounts are non-negative
    const amountFields = ['subtotal', 'tax', 'shipping', 'total'];
    amountFields.forEach(field => {
      const value = invoice[field as keyof CanonicalInvoice] as number;
      if (value && value < 0) {
        errors.push({
          field,
          error: `Negative amount not allowed: ${field} = ${value}`,
          severity: 'major'
        });
      }
    });
  }

  private validateBusinessRules(invoice: CanonicalInvoice, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Tax should generally be less than subtotal
    if (invoice.tax && invoice.subtotal && invoice.tax > invoice.subtotal) {
      warnings.push({
        field: 'tax',
        warning: `Tax amount (${invoice.tax}) seems high compared to subtotal (${invoice.subtotal})`,
        confidence_impact: -0.15
      });
    }

    // Shipping should be reasonable
    if (invoice.shipping && invoice.subtotal && invoice.shipping > invoice.subtotal * 0.5) {
      warnings.push({
        field: 'shipping',
        warning: `Shipping amount (${invoice.shipping}) seems high compared to subtotal (${invoice.subtotal})`,
        confidence_impact: -0.1
      });
    }

    // Total should be greater than subtotal
    if (invoice.total && invoice.subtotal && invoice.total < invoice.subtotal) {
      errors.push({
        field: 'total',
        error: `Total (${invoice.total}) cannot be less than subtotal (${invoice.subtotal})`,
        severity: 'major'
      });
    }
  }

  private validateLineItems(invoice: CanonicalInvoice, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!invoice.line_items || invoice.line_items.length === 0) {
      warnings.push({
        field: 'line_items',
        warning: 'No line items found',
        confidence_impact: -0.1
      });
      return;
    }

    invoice.line_items.forEach((item, index) => {
      // Check required fields
      if (!item.description || item.description.trim().length === 0) {
        errors.push({
          field: `line_items[${index}].description`,
          error: `Line item ${index + 1} missing description`,
          severity: 'minor'
        });
      }

      // Check quantities and prices are reasonable
      if (item.qty && item.qty <= 0) {
        errors.push({
          field: `line_items[${index}].qty`,
          error: `Line item ${index + 1} has invalid quantity: ${item.qty}`,
          severity: 'minor'
        });
      }

      if (item.unit_price && item.unit_price < 0) {
        errors.push({
          field: `line_items[${index}].unit_price`,
          error: `Line item ${index + 1} has negative unit price: ${item.unit_price}`,
          severity: 'minor'
        });
      }

      if (item.amount && item.amount < 0) {
        errors.push({
          field: `line_items[${index}].amount`,
          error: `Line item ${index + 1} has negative amount: ${item.amount}`,
          severity: 'minor'
        });
      }
    });
  }

  /**
   * Adjust confidence based on validation results
   */
  adjustConfidenceByValidation(originalConfidence: number, validation: ValidationResult): number {
    let adjustment = 0;

    // Reduce confidence for errors
    const criticalErrors = validation.errors.filter(e => e.severity === 'critical').length;
    const majorErrors = validation.errors.filter(e => e.severity === 'major').length;
    const minorErrors = validation.errors.filter(e => e.severity === 'minor').length;

    adjustment -= criticalErrors * 0.3;
    adjustment -= majorErrors * 0.15;
    adjustment -= minorErrors * 0.05;

    // Reduce confidence for warnings
    adjustment += validation.warnings.reduce((sum, w) => sum + w.confidence_impact, 0);

    // Boost confidence if no errors found
    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      adjustment += 0.1;
    }

    return Math.max(0.1, Math.min(0.99, originalConfidence + adjustment));
  }
}

export const invoiceValidator = new InvoiceValidatorService();