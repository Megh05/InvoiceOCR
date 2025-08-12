import { describe, it, expect, beforeEach } from '@jest/globals';
import { DeterministicParser } from '../src/services/parser/deterministic.js';

describe('DeterministicParser', () => {
  let parser;

  beforeEach(() => {
    parser = new DeterministicParser();
  });

  describe('Invoice Number Extraction', () => {
    it('should extract invoice number with standard format', () => {
      const text = 'Invoice Number: INV-2024-001';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.invoice_number).toBe('INV-2024-001');
      expect(result.field_confidences.find(f => f.field === 'invoice_number').confidence).toBeGreaterThan(0.8);
    });

    it('should extract invoice number with hash format', () => {
      const text = 'Invoice # ABC-123-456';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.invoice_number).toBe('ABC-123-456');
    });

    it('should return null for missing invoice number', () => {
      const text = 'Some random text without invoice number';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.invoice_number).toBeNull();
      expect(result.field_confidences.find(f => f.field === 'invoice_number').confidence).toBe(0);
    });
  });

  describe('Date Extraction', () => {
    it('should extract and normalize date in MM/DD/YYYY format', () => {
      const text = 'Invoice Date: 03/15/2024';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.invoice_date).toBe('2024-03-15');
    });

    it('should extract and normalize date in YYYY-MM-DD format', () => {
      const text = 'Date: 2024-03-15';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.invoice_date).toBe('2024-03-15');
    });

    it('should handle invalid dates gracefully', () => {
      const text = 'Date: 13/45/2024';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.invoice_date).toBeNull();
    });
  });

  describe('Amount Extraction', () => {
    it('should extract total amount correctly', () => {
      const text = 'Total: $1,234.56';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.total).toBe(1234.56);
    });

    it('should extract subtotal correctly', () => {
      const text = 'Subtotal: $999.99';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.subtotal).toBe(999.99);
    });

    it('should extract tax amount correctly', () => {
      const text = 'Tax: $85.50';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.tax).toBe(85.50);
    });
  });

  describe('Line Items Extraction', () => {
    it('should extract simple line items', () => {
      const text = `Description    Qty    Price    Amount
Premium Service    1    $1200.00    $1200.00
Consulting Hours   10   $150.00     $1500.00`;

      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.line_items).toHaveLength(2);
      expect(result.parsed.line_items[0].description).toBe('Premium Service');
      expect(result.parsed.line_items[0].qty).toBe(1);
      expect(result.parsed.line_items[0].unit_price).toBe(1200.00);
      expect(result.parsed.line_items[0].amount).toBe(1200.00);
    });

    it('should handle empty line items gracefully', () => {
      const text = 'No line items in this text';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.line_items).toEqual([]);
    });
  });

  describe('Vendor Information', () => {
    it('should extract vendor name from first line', () => {
      const text = `ABC Company Ltd.
123 Business Street
New York, NY 10001

Invoice Number: INV-001`;

      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.vendor_name).toBe('ABC Company Ltd.');
      expect(result.field_confidences.find(f => f.field === 'vendor_name').confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Currency Detection', () => {
    it('should detect USD currency from dollar sign', () => {
      const text = 'Total: $100.00';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.currency).toBe('USD');
    });

    it('should detect EUR currency from euro symbol', () => {
      const text = 'Total: €100.00';
      const result = parser.parse(text, text, 1.0);
      
      expect(result.parsed.currency).toBe('EUR');
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate overall confidence based on field confidences', () => {
      const text = `INV-2024-001
ABC Company Ltd.
Total: $100.00`;

      const result = parser.parse(text, text, 1.0);
      
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include action when confidence is low', () => {
      const text = 'Very poor quality text with no clear invoice data';
      const result = parser.parse(text, text, 0.3);
      
      expect(result.confidence).toBeLessThan(0.85);
      expect(result.action).toContain('review and edit');
    });
  });

  describe('OCR Similarity Integration', () => {
    it('should incorporate similarity score into overall confidence', () => {
      const text = 'Invoice INV-001 Total: $100.00';
      const result1 = parser.parse(text, text, 1.0);
      const result2 = parser.parse(text, text, 0.5);
      
      expect(result1.confidence).toBeGreaterThan(result2.confidence);
    });
  });
});
