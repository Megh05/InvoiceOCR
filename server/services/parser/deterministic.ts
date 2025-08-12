import { CanonicalInvoice } from "@shared/schema";

interface FieldConfidence {
  field: string;
  value: any;
  confidence: number;
  source: string;
}

export interface ParsingResult {
  parsed: CanonicalInvoice;
  confidence: number;
  field_confidences: FieldConfidence[];
  fallback_used: boolean;
  action?: string;
}

export class DeterministicParser {
  private confidenceThreshold = 0.85;

  parse(ocrText: string, mistralOcrText: string, similarityScore: number = 1.0): ParsingResult {
    const fieldConfidences: FieldConfidence[] = [];
    
    // Use the primary OCR text for parsing
    const textToParse = ocrText;
    
    // Extract invoice number
    const invoiceNumber = this.extractInvoiceNumber(textToParse);
    fieldConfidences.push({
      field: "invoice_number",
      value: invoiceNumber.value,
      confidence: invoiceNumber.confidence,
      source: "regex_pattern"
    });

    // Extract invoice date
    const invoiceDate = this.extractInvoiceDate(textToParse);
    fieldConfidences.push({
      field: "invoice_date",
      value: invoiceDate.value,
      confidence: invoiceDate.confidence,
      source: "date_pattern"
    });

    // Extract vendor information
    const vendorName = this.extractVendorName(textToParse);
    fieldConfidences.push({
      field: "vendor_name",
      value: vendorName.value,
      confidence: vendorName.confidence,
      source: "text_analysis"
    });

    const vendorAddress = this.extractVendorAddress(textToParse);
    fieldConfidences.push({
      field: "vendor_address",
      value: vendorAddress.value,
      confidence: vendorAddress.confidence,
      source: "text_analysis"
    });

    // Extract billing information
    const billTo = this.extractBillTo(textToParse);
    fieldConfidences.push({
      field: "bill_to",
      value: billTo.value,
      confidence: billTo.confidence,
      source: "keyword_search"
    });

    const shipTo = this.extractShipTo(textToParse);
    fieldConfidences.push({
      field: "ship_to",
      value: shipTo.value,
      confidence: shipTo.confidence,
      source: "keyword_search"
    });

    // Extract currency
    const currency = this.extractCurrency(textToParse);
    fieldConfidences.push({
      field: "currency",
      value: currency.value,
      confidence: currency.confidence,
      source: "currency_symbol"
    });

    // Extract totals
    const totals = this.extractTotals(textToParse);
    fieldConfidences.push(...totals.confidences);

    // Extract line items
    const lineItems = this.extractLineItems(textToParse);
    fieldConfidences.push({
      field: "line_items",
      value: lineItems.value,
      confidence: lineItems.confidence,
      source: "table_extraction"
    });

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(fieldConfidences, similarityScore);

    const parsed: CanonicalInvoice = {
      invoice_number: invoiceNumber.value,
      invoice_date: invoiceDate.value,
      vendor_name: vendorName.value,
      vendor_address: vendorAddress.value,
      bill_to: billTo.value,
      ship_to: shipTo.value,
      currency: currency.value,
      subtotal: totals.subtotal,
      tax: totals.tax,
      shipping: totals.shipping,
      total: totals.total,
      line_items: lineItems.value,
      raw_ocr_text: ocrText,
      mistral_ocr_text: mistralOcrText,
      ocr_similarity_score: similarityScore,
    };

    const result: ParsingResult = {
      parsed,
      confidence: overallConfidence,
      field_confidences: fieldConfidences,
      fallback_used: false,
    };

    if (overallConfidence < this.confidenceThreshold) {
      result.action = "Please review and edit the extracted fields. Some fields may require manual correction due to low confidence scores.";
    }

    return result;
  }

  private extractInvoiceNumber(text: string): { value: string | null; confidence: number } {
    const patterns = [
      /invoice\s*(?:number|#|no\.?)\s*:?\s*([A-Z0-9\-]+)/i,
      /inv(?:oice)?\s*#?\s*:?\s*([A-Z0-9\-]+)/i,
      /(?:^|\n)\s*([A-Z]{2,}\-\d{4,}\-\d{3,})\s*$/im,
      /Invoice\s+No\s+(\d+)/i,
      /Invoice\s+(?:WMACCESS|[A-Z]+)[\s\S]*?(\d{6,})/,
      /(\d{6,})\s+\d{4,}\s+\d{2}\.\d{2}\.\d{4}/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();
        const confidence = this.assessInvoiceNumberConfidence(value);
        return { value, confidence };
      }
    }

    return { value: null, confidence: 0 };
  }

  private extractInvoiceDate(text: string): { value: string | null; confidence: number } {
    const patterns = [
      /invoice\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
      /Date\s+(\d{1,2}\.\s*\w+\s+\d{4})/i,
      /(\d{2}\.\d{2}\.\d{4})\s*$/m,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dateStr = match[1];
        const normalizedDate = this.normalizeDateString(dateStr);
        if (normalizedDate) {
          return { value: normalizedDate, confidence: 0.9 };
        }
      }
    }

    return { value: null, confidence: 0 };
  }

  private extractVendorName(text: string): { value: string | null; confidence: number } {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length > 0) {
      // First non-empty line is often the vendor name
      const firstLine = lines[0];
      if (firstLine && !firstLine.toLowerCase().includes('invoice') && firstLine.length > 2) {
        const confidence = this.assessVendorNameConfidence(firstLine);
        return { value: firstLine, confidence };
      }
    }

    return { value: null, confidence: 0 };
  }

  private extractVendorAddress(text: string): { value: string | null; confidence: number } {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for address patterns after the first few lines
    let addressLines: string[] = [];
    let startCapturing = false;
    
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const line = lines[i];
      
      // Skip invoice-related lines
      if (line.toLowerCase().includes('invoice')) continue;
      
      // Look for address indicators
      if (this.looksLikeAddress(line)) {
        startCapturing = true;
      }
      
      if (startCapturing) {
        addressLines.push(line);
        
        // Stop at bill to or similar sections
        if (line.toLowerCase().includes('bill to') || 
            line.toLowerCase().includes('ship to') || 
            addressLines.length >= 3) {
          break;
        }
      }
    }

    if (addressLines.length > 0) {
      const address = addressLines.join('\n');
      return { value: address, confidence: 0.7 };
    }

    return { value: null, confidence: 0 };
  }

  private extractBillTo(text: string): { value: string | null; confidence: number } {
    return this.extractAddressSection(text, ['bill to', 'billed to', 'customer']);
  }

  private extractShipTo(text: string): { value: string | null; confidence: number } {
    return this.extractAddressSection(text, ['ship to', 'shipped to', 'delivery']);
  }

  private extractAddressSection(text: string, keywords: string[]): { value: string | null; confidence: number } {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      for (const keyword of keywords) {
        if (line.includes(keyword)) {
          const addressLines: string[] = [];
          
          // Capture the next few lines as address
          for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
            const nextLine = lines[j];
            
            // Stop at certain keywords that indicate new sections
            if (this.isNewSection(nextLine)) break;
            
            if (nextLine.trim().length > 0) {
              addressLines.push(nextLine);
            }
          }
          
          if (addressLines.length > 0) {
            return { value: addressLines.join('\n'), confidence: 0.8 };
          }
        }
      }
    }

    return { value: null, confidence: 0 };
  }

  private extractCurrency(text: string): { value: string | null; confidence: number } {
    const currencyPatterns = [
      { symbol: '$', code: 'USD' },
      { symbol: '€', code: 'EUR' },
      { symbol: '£', code: 'GBP' },
      { symbol: '¥', code: 'JPY' },
    ];

    for (const { symbol, code } of currencyPatterns) {
      if (text.includes(symbol)) {
        return { value: code, confidence: 0.9 };
      }
    }

    // Look for explicit currency codes
    const currencyMatch = text.match(/\b(USD|EUR|GBP|JPY|CAD|AUD)\b/i);
    if (currencyMatch) {
      return { value: currencyMatch[1].toUpperCase(), confidence: 0.95 };
    }

    return { value: null, confidence: 0.3 };
  }

  private extractTotals(text: string): {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    confidences: FieldConfidence[];
  } {
    const confidences: FieldConfidence[] = [];
    
    const subtotal = this.extractAmount(text, ['subtotal', 'sub total', 'net amount']);
    confidences.push({
      field: "subtotal",
      value: subtotal.value,
      confidence: subtotal.confidence,
      source: "amount_pattern"
    });

    const tax = this.extractAmount(text, ['tax', 'vat', 'gst']);
    confidences.push({
      field: "tax",
      value: tax.value,
      confidence: tax.confidence,
      source: "amount_pattern"
    });

    const shipping = this.extractAmount(text, ['shipping', 'delivery', 'freight']);
    confidences.push({
      field: "shipping",
      value: shipping.value,
      confidence: shipping.confidence,
      source: "amount_pattern"
    });

    const total = this.extractAmount(text, ['total', 'grand total', 'amount due']);
    confidences.push({
      field: "total",
      value: total.value,
      confidence: total.confidence,
      source: "amount_pattern"
    });

    return {
      subtotal: subtotal.value,
      tax: tax.value,
      shipping: shipping.value,
      total: total.value,
      confidences,
    };
  }

  private extractAmount(text: string, keywords: string[]): { value: number; confidence: number } {
    for (const keyword of keywords) {
      const patterns = [
        new RegExp(`${keyword}\\s*:?\\s*\\$?([\\d,]+\\.?\\d*)`, 'i'),
        new RegExp(`${keyword}\\s*\\$([\\d,]+\\.?\\d*)`, 'i'),
        new RegExp(`${keyword}\\s*([\\d,]+,\\d{2})\\s*€`, 'i'), // German format with Euro
        new RegExp(`${keyword}.*?([\\d,]+,\\d{2})\\s*€`, 'i'), // More flexible German format
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          let amount = parseFloat(match[1].replace(/,/g, '.').replace(/\./g, ''));
          // Handle German decimal format (comma as decimal separator)
          if (match[1].includes(',')) {
            amount = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
          }
          if (!isNaN(amount)) {
            return { value: amount, confidence: 0.85 };
          }
        }
      }
    }

    // Look for specific German invoice totals
    const germanTotalPatterns = [
      /Total\s+([0-9,]+,\d{2})\s*€/i,
      /Gross Amount.*?([0-9,]+,\d{2})\s*€/i,
    ];

    for (const pattern of germanTotalPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        if (!isNaN(amount)) {
          return { value: amount, confidence: 0.9 };
        }
      }
    }

    return { value: 0, confidence: 0.1 };
  }

  private extractLineItems(text: string): { 
    value: Array<{
      line_number: number;
      sku: string | null;
      description: string;
      qty: number;
      unit_price: number;
      amount: number;
      tax: number;
    }>; 
    confidence: number 
  } {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const items: Array<{
      line_number: number;
      sku: string | null;
      description: string;
      qty: number;
      unit_price: number;
      amount: number;
      tax: number;
    }> = [];

    let inItemsSection = false;
    let lineNumber = 1;

    for (const line of lines) {
      // Detect start of items section - more flexible patterns
      if (this.isItemsHeader(line) || line.includes('Service Description') || line.includes('Amount')) {
        inItemsSection = true;
        continue;
      }

      // Detect end of items section
      if (inItemsSection && (this.isEndOfItems(line) || line.includes('Total') || line.includes('VAT'))) {
        break;
      }

      if (inItemsSection) {
        const item = this.parseGermanInvoiceItemLine(line, lineNumber);
        if (item) {
          items.push(item);
          lineNumber++;
        }
      }
    }

    const confidence = items.length > 0 ? 0.8 : 0.1;
    return { value: items, confidence };
  }

  private isItemsHeader(line: string): boolean {
    const headers = ['description', 'item', 'product', 'service', 'qty', 'quantity', 'price', 'amount'];
    const lowerLine = line.toLowerCase();
    return headers.some(header => lowerLine.includes(header));
  }

  private isEndOfItems(line: string): boolean {
    const endKeywords = ['subtotal', 'total', 'tax', 'payment', 'terms'];
    const lowerLine = line.toLowerCase();
    return endKeywords.some(keyword => lowerLine.includes(keyword));
  }

  private parseGermanInvoiceItemLine(line: string, lineNumber: number): {
    line_number: number;
    sku: string | null;
    description: string;
    qty: number;
    unit_price: number;
    amount: number;
    tax: number;
  } | null {
    // Skip header lines and empty lines
    if (line.includes('Service Description') || line.includes('Amount') || line.includes('quantity') || line.length < 10) {
      return null;
    }

    // German invoice format: "Description    Price    Qty    Total"
    // Example: "Basic Fee wmView                                                            130,00 €                       1               130,00 €"
    
    // Look for lines with Euro amounts
    const euroPattern = /(\d+,\d{2})\s*€/g;
    const euroMatches: RegExpMatchArray[] = [];
    let match;
    while ((match = euroPattern.exec(line)) !== null) {
      euroMatches.push(match);
    }
    
    if (euroMatches.length >= 2) {
      // Extract description (everything before the first euro amount)
      const firstEuroIndex = line.indexOf(euroMatches[0][0]);
      const description = line.substring(0, firstEuroIndex).trim();
      
      if (description.length > 5) {
        // Parse the euro amounts
        const unitPriceStr = euroMatches[0][1].replace(',', '.');
        const totalAmountStr = euroMatches[euroMatches.length - 1][1].replace(',', '.');
        
        const unitPrice = parseFloat(unitPriceStr);
        const amount = parseFloat(totalAmountStr);
        
        // Extract quantity (look for number between euro amounts)
        const middlePart = line.substring(
          line.indexOf(euroMatches[0][0]) + euroMatches[0][0].length,
          line.indexOf(euroMatches[euroMatches.length - 1][0])
        );
        
        const qtyMatch = middlePart.match(/\b(\d+)\b/);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        
        return {
          line_number: lineNumber,
          sku: null,
          description,
          qty,
          unit_price: unitPrice,
          amount,
          tax: 0,
        };
      }
    }

    return null;
  }

  private parseItemLine(line: string, lineNumber: number): {
    line_number: number;
    sku: string | null;
    description: string;
    qty: number;
    unit_price: number;
    amount: number;
    tax: number;
  } | null {
    // Try to parse a line that looks like: "Description    Qty    Price    Amount"
    const parts = line.split(/\s{2,}/).filter(part => part.trim().length > 0);
    
    if (parts.length >= 3) {
      const description = parts[0];
      let qty = 1;
      let unitPrice = 0;
      let amount = 0;

      // Try to find numeric values
      const numbers = parts.slice(1).map(part => {
        const cleaned = part.replace(/[$,]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      });

      if (numbers.length >= 2) {
        qty = numbers[0] || 1;
        if (numbers.length === 2) {
          amount = numbers[1];
          unitPrice = amount / qty;
        } else if (numbers.length >= 3) {
          unitPrice = numbers[1];
          amount = numbers[2];
        }
      }

      if (description.length > 2) {
        return {
          line_number: lineNumber,
          sku: null,
          description,
          qty,
          unit_price: unitPrice,
          amount,
          tax: 0,
        };
      }
    }

    return null;
  }

  // Helper methods for confidence assessment
  private assessInvoiceNumberConfidence(value: string): number {
    if (value.length < 3) return 0.3;
    if (/^[A-Z]{2,}\-\d{4,}\-\d{3,}$/.test(value)) return 0.95;
    if (/[A-Z].*\d|\d.*[A-Z]/.test(value)) return 0.8;
    return 0.6;
  }

  private assessVendorNameConfidence(value: string): number {
    if (value.includes('Ltd') || value.includes('Inc') || value.includes('Corp') || value.includes('LLC')) return 0.9;
    if (value.includes('Company') || value.includes('Co.')) return 0.85;
    if (value.length > 10 && /[A-Z]/.test(value)) return 0.7;
    return 0.5;
  }

  private looksLikeAddress(line: string): boolean {
    const addressIndicators = [
      /\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|blvd|boulevard)/i,
      /\d{5}(?:-\d{4})?/, // ZIP code
      /[A-Z]{2}\s+\d{5}/, // State ZIP
    ];

    return addressIndicators.some(pattern => pattern.test(line));
  }

  private isNewSection(line: string): boolean {
    const sectionKeywords = [
      'invoice', 'bill to', 'ship to', 'description', 'qty', 'quantity', 
      'price', 'amount', 'subtotal', 'total', 'tax', 'payment', 'terms'
    ];
    const lowerLine = line.toLowerCase();
    return sectionKeywords.some(keyword => lowerLine.includes(keyword));
  }

  private normalizeDateString(dateStr: string): string | null {
    try {
      // Handle various date formats
      const cleanDate = dateStr.replace(/[^\d\/\-\.]/g, '');
      const parts = cleanDate.split(/[\/\-\.]/);
      
      if (parts.length === 3) {
        let [part1, part2, part3] = parts.map(p => parseInt(p, 10));
        
        // Determine format based on values
        let year, month, day;
        
        if (part1 > 31 || part1 > 12 && part3 <= 31) {
          // YYYY-MM-DD or YYYY-DD-MM
          year = part1;
          if (part2 <= 12) {
            month = part2;
            day = part3;
          } else {
            month = part3;
            day = part2;
          }
        } else if (part3 > 31 || (part1 <= 12 && part2 <= 31 && part3 > 31)) {
          // MM-DD-YYYY or DD-MM-YYYY  
          year = part3;
          if (part1 <= 12) {
            month = part1;
            day = part2;
          } else {
            month = part2;
            day = part1;
          }
        } else {
          return null;
        }
        
        // Adjust year if it's 2-digit
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        // Validate ranges
        if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
          return null;
        }
        
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      }
    } catch (error) {
      return null;
    }
    
    return null;
  }

  private calculateOverallConfidence(fieldConfidences: FieldConfidence[], similarityScore: number): number {
    if (fieldConfidences.length === 0) return 0;

    const totalConfidence = fieldConfidences.reduce((sum, field) => sum + field.confidence, 0);
    const averageConfidence = totalConfidence / fieldConfidences.length;
    
    // Weight the similarity score into overall confidence
    return (averageConfidence * 0.8) + (similarityScore * 0.2);
  }
}

export const deterministicParser = new DeterministicParser();
