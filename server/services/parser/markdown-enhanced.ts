import { CanonicalInvoice } from "@shared/schema";
import { FieldConfidence } from './deterministic';

/**
 * Enhanced parser that leverages Mistral OCR's markdown output
 * for better structured data extraction
 */
export class MarkdownEnhancedParser {
  parse(markdownText: string, plainText: string): {
    parsed: CanonicalInvoice;
    confidence: number;
    field_confidences: FieldConfidence[];
  } {
    const fieldConfidences: FieldConfidence[] = [];
    
    // Use markdown structure for better parsing
    const invoiceData: Partial<CanonicalInvoice> = {
      invoice_number: undefined,
      invoice_date: undefined,
      vendor_name: undefined,
      vendor_address: undefined,
      bill_to: undefined,
      ship_to: undefined,
      currency: 'USD',
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      line_items: [],
      raw_ocr_text: plainText,
      mistral_ocr_text: markdownText,
      ocr_similarity_score: 1.0,
      category: 'General'
    };

    // Extract structured data using markdown patterns
    const invoiceNumber = this.extractFromMarkdownTable(markdownText, ['invoice', 'number', 'ref']) || 
                         this.extractSimplePattern(plainText, /(?:invoice|ref|number)\s*:?\s*([A-Z0-9\-]+)/i);
    if (invoiceNumber) {
      invoiceData.invoice_number = invoiceNumber;
      fieldConfidences.push({
        field: 'invoice_number',
        value: invoiceNumber,
        confidence: 0.85,
        source: 'markdown_table'
      });
    }

    // Extract date using markdown structure
    const invoiceDate = this.extractDateFromMarkdown(markdownText) || 
                       this.extractDateFromText(plainText);
    if (invoiceDate) {
      invoiceData.invoice_date = invoiceDate;
      fieldConfidences.push({
        field: 'invoice_date',
        value: invoiceDate,
        confidence: 0.9,
        source: 'markdown_pattern'
      });
    }

    // Extract vendor using markdown headers
    const vendorName = this.extractVendorFromMarkdown(markdownText) || 
                      this.extractVendorFromText(plainText);
    if (vendorName) {
      invoiceData.vendor_name = vendorName;
      fieldConfidences.push({
        field: 'vendor_name',
        value: vendorName,
        confidence: 0.8,
        source: 'markdown_header'
      });
    }

    // Extract amounts using markdown tables and bold patterns
    const totalAmount = this.extractAmountFromMarkdown(markdownText, ['total', 'amount']) ||
                       this.extractAmountFromText(plainText, ['total']);
    if (totalAmount > 0) {
      invoiceData.total = totalAmount;
      fieldConfidences.push({
        field: 'total',
        value: totalAmount,
        confidence: 0.9,
        source: 'markdown_table'
      });
    }

    // Extract line items using markdown tables
    const lineItems = this.extractLineItemsFromMarkdown(markdownText) ||
                     this.extractLineItemsFromText(plainText);
    if (lineItems.length > 0) {
      invoiceData.line_items = lineItems;
      fieldConfidences.push({
        field: 'line_items',
        value: lineItems,
        confidence: 0.85,
        source: 'markdown_table'
      });
    }

    // Extract addresses using markdown structure
    const billTo = this.extractAddressFromMarkdown(markdownText, 'bill') ||
                  this.extractAddressFromText(plainText, 'bill');
    if (billTo) {
      invoiceData.bill_to = billTo;
      fieldConfidences.push({
        field: 'bill_to',
        value: billTo,
        confidence: 0.8,
        source: 'markdown_section'
      });
    }

    const overallConfidence = this.calculateOverallConfidence(fieldConfidences);

    return {
      parsed: invoiceData as CanonicalInvoice,
      confidence: overallConfidence,
      field_confidences: fieldConfidences
    };
  }

  private extractFromMarkdownTable(markdown: string, keywords: string[]): string | null {
    // Look for table rows with key-value pairs
    const tableRows = markdown.match(/\|[^|\n]+\|[^|\n]+\|/g) || [];
    
    for (const row of tableRows) {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      if (cells.length >= 2) {
        const key = cells[0].toLowerCase();
        const value = cells[1];
        
        if (keywords.some(keyword => key.includes(keyword))) {
          return value.trim();
        }
      }
    }
    
    return null;
  }

  private extractDateFromMarkdown(markdown: string): string | null {
    // Look for bold date patterns
    const boldDatePattern = /\*\*([^*]+)\*\*/g;
    let match;
    
    while ((match = boldDatePattern.exec(markdown)) !== null) {
      const dateStr = match[1];
      const normalizedDate = this.normalizeDate(dateStr);
      if (normalizedDate) return normalizedDate;
    }
    
    // Look for table cells with dates
    const dateFromTable = this.extractFromMarkdownTable(markdown, ['date', 'invoice date']);
    if (dateFromTable) {
      return this.normalizeDate(dateFromTable);
    }
    
    return null;
  }

  private extractVendorFromMarkdown(markdown: string): string | null {
    // Look for the first header (likely vendor name)
    const headerMatch = markdown.match(/^#+\s*(.+)$/m);
    if (headerMatch) {
      const header = headerMatch[1].trim();
      if (header.length > 3 && !header.toLowerCase().includes('invoice')) {
        return header;
      }
    }
    
    // Look for bold text at the beginning
    const boldStart = markdown.match(/^\*\*([^*]+)\*\*/);
    if (boldStart) {
      return boldStart[1].trim();
    }
    
    return null;
  }

  private extractAmountFromMarkdown(markdown: string, keywords: string[]): number {
    // Look for bold amounts
    const boldAmountPattern = /\*\*\$?(\d+(?:,\d{3})*\.?\d*)\*\*/g;
    let match;
    let lastAmount = 0;
    
    while ((match = boldAmountPattern.exec(markdown)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) {
        lastAmount = amount; // Usually the last bold amount is the total
      }
    }
    
    if (lastAmount > 0) return lastAmount;
    
    // Look in tables
    for (const keyword of keywords) {
      const tableAmount = this.extractFromMarkdownTable(markdown, [keyword]);
      if (tableAmount) {
        const amount = parseFloat(tableAmount.replace(/[\$,]/g, ''));
        if (!isNaN(amount)) return amount;
      }
    }
    
    return 0;
  }

  private extractLineItemsFromMarkdown(markdown: string): Array<{
    line_number: number;
    sku: string | null;
    description: string;
    qty: number;
    unit_price: number;
    amount: number;
    tax: number;
  }> {
    const items: Array<{
      line_number: number;
      sku: string | null;
      description: string;
      qty: number;
      unit_price: number;
      amount: number;
      tax: number;
    }> = [];
    
    // Look for markdown tables with line items
    const tablePattern = /\|[^|\n]+\|[^|\n]+\|[^|\n]+\|/g;
    const tableRows = markdown.match(tablePattern) || [];
    
    let lineNumber = 1;
    for (const row of tableRows) {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      
      if (cells.length >= 3) {
        const description = cells[0];
        const qty = this.parseNumber(cells[1]) || 1;
        const amount = this.parseNumber(cells[cells.length - 1]) || 0;
        const unitPrice = qty > 0 ? amount / qty : amount;
        
        if (description.length > 3 && !description.toLowerCase().includes('description')) {
          items.push({
            line_number: lineNumber++,
            sku: null,
            description,
            qty,
            unit_price: unitPrice,
            amount,
            tax: 0
          });
        }
      }
    }
    
    return items;
  }

  private extractAddressFromMarkdown(markdown: string, type: string): string | null {
    // Look for address sections in markdown
    const addressPattern = new RegExp(`## ${type}[^#]*?([\\s\\S]*?)(?=##|$)`, 'i');
    const match = markdown.match(addressPattern);
    
    if (match) {
      return match[1].trim();
    }
    
    return null;
  }

  // Fallback text extraction methods
  private extractSimplePattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  private extractDateFromText(text: string): string | null {
    const datePatterns = [
      /date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return this.normalizeDate(match[1]);
      }
    }
    
    return null;
  }

  private extractVendorFromText(text: string): string | null {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines.slice(0, 5)) {
      if (line.length > 3 && !line.toLowerCase().includes('invoice')) {
        return line;
      }
    }
    
    return null;
  }

  private extractAmountFromText(text: string, keywords: string[]): number {
    for (const keyword of keywords) {
      const pattern = new RegExp(`${keyword}\\s*:?\\s*\\$?([\\d,]+\\.?\\d*)`, 'i');
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount)) return amount;
      }
    }
    
    return 0;
  }

  private extractLineItemsFromText(text: string): Array<{
    line_number: number;
    sku: string | null;
    description: string;
    qty: number;
    unit_price: number;
    amount: number;
    tax: number;
  }> {
    // Basic line item extraction for fallback
    const lines = text.split('\n');
    const items: Array<{
      line_number: number;
      sku: string | null;
      description: string;
      qty: number;
      unit_price: number;
      amount: number;
      tax: number;
    }> = [];
    
    let lineNumber = 1;
    for (const line of lines) {
      const amountMatch = line.match(/(\d+\.\d{2})\s*$/);
      if (amountMatch) {
        const amount = parseFloat(amountMatch[1]);
        const description = line.replace(/\s*\d+\.\d{2}\s*$/, '').trim();
        
        if (description.length > 3) {
          items.push({
            line_number: lineNumber++,
            sku: null,
            description,
            qty: 1,
            unit_price: amount,
            amount,
            tax: 0
          });
        }
      }
    }
    
    return items;
  }

  private extractAddressFromText(text: string, type: string): string | null {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(type)) {
        const addressLines: string[] = [];
        for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
          const line = lines[j];
          if (line.length > 0 && !this.isNewSection(line)) {
            addressLines.push(line);
          } else {
            break;
          }
        }
        if (addressLines.length > 0) {
          return addressLines.join('\n');
        }
      }
    }
    
    return null;
  }

  private normalizeDate(dateStr: string): string | null {
    try {
      const cleanDate = dateStr.replace(/[^\d\/\-\.]/g, '');
      const parts = cleanDate.split(/[\/\-\.]/);
      
      if (parts.length === 3) {
        let [part1, part2, part3] = parts.map(p => parseInt(p, 10));
        
        let year, month, day;
        
        if (part1 > 1900) {
          year = part1;
          month = part2;
          day = part3;
        } else if (part3 > 1900) {
          year = part3;
          if (part1 <= 12) {
            month = part1;
            day = part2;
          } else {
            day = part1;
            month = part2;
          }
        } else {
          month = part1;
          day = part2;
          year = part3 <= 30 ? 2000 + part3 : 1900 + part3;
        }
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    } catch (error) {
      console.warn('Date parsing error:', error);
    }
    
    return null;
  }

  private parseNumber(str: string): number | null {
    const cleaned = str.replace(/[\$,]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private isNewSection(line: string): boolean {
    const sectionKeywords = ['total', 'subtotal', 'tax', 'shipping', 'terms', 'notes'];
    return sectionKeywords.some(keyword => line.toLowerCase().includes(keyword));
  }

  private calculateOverallConfidence(fieldConfidences: FieldConfidence[]): number {
    if (fieldConfidences.length === 0) return 0;
    
    const totalConfidence = fieldConfidences.reduce((sum, field) => sum + field.confidence, 0);
    return totalConfidence / fieldConfidences.length;
  }
}

export const markdownEnhancedParser = new MarkdownEnhancedParser();