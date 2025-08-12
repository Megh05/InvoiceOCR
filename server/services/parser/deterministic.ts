import { CanonicalInvoice } from "@shared/schema";
import { templateRecognitionService } from "../template-recognition";

interface FieldConfidence {
  field: string;
  value: any;
  confidence: number;
  source: string;
}

interface TemplateMatch {
  template_id: string;
  template_name: string;
  confidence: number;
  matched_patterns: string[];
}

export interface ParsingResult {
  parsed: CanonicalInvoice;
  confidence: number;
  field_confidences: FieldConfidence[];
  fallback_used: boolean;
  template_match?: TemplateMatch;
  raw_ocr_text: string;
  action?: string;
}

export class DeterministicParser {
  private confidenceThreshold = 0.85;

  parse(ocrText: string, mistralOcrText: string, similarityScore: number = 1.0): ParsingResult {
    const fieldConfidences: FieldConfidence[] = [];
    
    // First, perform template recognition
    let templateMatch: TemplateMatch | null = null;
    try {
      templateMatch = templateRecognitionService.recognizeTemplate(ocrText);
    } catch (error) {
      console.warn("Template recognition failed:", error);
    }
    
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

    // Auto-categorize based on template match
    if (templateMatch) {
      parsed.template_id = templateMatch.template_id;
      parsed.category = templateRecognitionService.categorizeInvoice(templateMatch, parsed);
    } else {
      parsed.category = templateRecognitionService.categorizeInvoice(null, parsed);
    }

    const result: ParsingResult = {
      parsed,
      confidence: overallConfidence,
      field_confidences: fieldConfidences,
      fallback_used: false,
      template_match: templateMatch || undefined,
      raw_ocr_text: ocrText,
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
      // Statement format - look for reference numbers
      /^(\d{6})\s*$/m,  // 6-digit number on its own line
      /^([A-Z0-9]{4,})\s*$/m,  // Alphanumeric codes on their own line
      /(?:statement|account|ref(?:erence)?)\s*:?\s*([A-Z0-9\-]+)/i,
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
      // Statement date formats
      /DATE\s+(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4})/i,
      /^(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4})\s*$/m,
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
    
    // For statements, look for vendor info after "IN ACCOUNT WITH" or "BILL"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.toUpperCase().includes('IN ACCOUNT WITH') || line.toUpperCase() === 'BILL') {
        // Look for vendor information in the next few lines
        for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
          const nextLine = lines[j];
          
          // Skip addresses and get the first non-address line
          if (!this.looksLikeAddress(nextLine) && nextLine.length > 5) {
            const confidence = this.assessVendorNameConfidence(nextLine);
            if (confidence > 0.3) {
              return { value: nextLine, confidence };
            }
          }
        }
      }
    }
    
    // Fallback: look for company names in first few lines, but skip obvious headers
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      
      // Skip pure numbers, dates, and common headers
      if (/^\d+$/.test(line) || 
          /^\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}$/.test(line) ||
          line.toLowerCase().match(/^(statement|date|to|terms|in account with|bill)$/)) {
        continue;
      }
      
      // Look for business names
      if (line.length > 3 && !line.toLowerCase().includes('invoice')) {
        const confidence = this.assessVendorNameConfidence(line);
        if (confidence > 0.3) {
          return { value: line, confidence };
        }
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
    const result = this.extractAddressSection(text, ['bill to', 'billed to', 'customer', 'to']);
    
    // If no explicit "bill to" found, look for address patterns after "TO"
    if (!result.value || result.confidence < 0.5) {
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toUpperCase() === 'TO') {
          const addressLines: string[] = [];
          
          // Capture the next few lines as address
          for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
            const nextLine = lines[j];
            
            // Stop at certain keywords
            if (this.isNewSection(nextLine) || nextLine.toUpperCase() === 'TERMS') break;
            
            if (nextLine.trim().length > 0) {
              addressLines.push(nextLine);
            }
          }
          
          if (addressLines.length > 0) {
            return { value: addressLines.join('\n'), confidence: 0.7 };
          }
        }
      }
    }
    
    return result;
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

    // Look for statement format amounts - often at the end with $ sign
    const statementAmountPatterns = [
      /TOTAL AMOUNT\s+\$(\d+\.\d{2})/i,
      /AMOUNT\s+\$(\d+\.\d{2})/i,
      /\$(\d+\.\d{2})\s*$/m,  // Dollar amount at end of line
    ];
    
    // For statements, specifically look for the total amount pattern
    if (keywords.includes('total')) {
      const totalMatch = text.match(/TOTAL AMOUNT\s+\$(\d+\.\d{2})/i);
      if (totalMatch) {
        const amount = parseFloat(totalMatch[1]);
        return { value: amount, confidence: 0.9 };
      }
    }

    for (const pattern of statementAmountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1]);
        if (!isNaN(amount)) {
          return { value: amount, confidence: 0.8 };
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

    let lineNumber = 1;

    // Look for statement-style line items (date + description + amount)
    for (const line of lines) {
      // Skip headers and addresses
      if (this.isStatementHeader(line) || this.looksLikeAddress(line)) {
        continue;
      }

      // Try to parse as statement line item
      const statementItem = this.parseStatementLine(line, lineNumber);
      if (statementItem) {
        items.push(statementItem);
        lineNumber++;
        continue;
      }

      // Try German invoice format
      const germanItem = this.parseGermanInvoiceItemLine(line, lineNumber);
      if (germanItem) {
        items.push(germanItem);
        lineNumber++;
        continue;
      }

      // Try general item format
      const generalItem = this.parseItemLine(line, lineNumber);
      if (generalItem) {
        items.push(generalItem);
        lineNumber++;
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

  private isStatementHeader(line: string): boolean {
    const headers = ['statement', 'date', 'to', 'terms', 'in account with', 'bill', 'current', 'over 30 days', 'over 60 days'];
    const lowerLine = line.toLowerCase();
    return headers.some(header => lowerLine.includes(header)) || 
           /^\d{6}$/.test(line) || // Pure 6-digit numbers
           /^\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}$/.test(line); // Pure dates
  }

  private parseStatementLine(line: string, lineNumber: number): {
    line_number: number;
    sku: string | null;
    description: string;
    qty: number;
    unit_price: number;
    amount: number;
    tax: number;
  } | null {
    // Look for lines with date and amount pattern first
    // Example: "1-18-19    25.00"
    const dateAmountPattern = /^(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4})\s+(\d+\.\d{2})\s*$/;
    const dateAmountMatch = line.match(dateAmountPattern);
    
    if (dateAmountMatch) {
      const amount = parseFloat(dateAmountMatch[2]);
      const description = `Service charge on ${dateAmountMatch[1]}`;
      
      return {
        line_number: lineNumber,
        sku: null,
        description,
        qty: 1,
        unit_price: amount,
        amount,
        tax: 0,
      };
    }
    
    // Look for lines with just amount at the end
    const amountMatch = line.match(/(\d+\.\d{2})\s*$/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      const description = line.replace(/\s*\d+\.\d{2}\s*$/, '').trim();
      
      if (description.length > 3 && !this.isStatementHeader(description)) {
        return {
          line_number: lineNumber,
          sku: null,
          description,
          qty: 1,
          unit_price: amount,
          amount,
          tax: 0,
        };
      }
    }

    // Look for description-only lines that might be items
    if (line.length > 5 && !this.isStatementHeader(line) && !this.looksLikeAddress(line)) {
      // Check if it's a description line for a service
      if (line.match(/^[A-Z\s]+$/i) && (line.includes('FOR') || line.includes('SERVICE') || line.includes('CHARGE'))) {
        return {
          line_number: lineNumber,
          sku: null,
          description: line,
          qty: 1,
          unit_price: 0,
          amount: 0,
          tax: 0,
        };
      }
    }

    return null;
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
        
        // If first part is 4 digits, assume YYYY-MM-DD
        if (part1 > 1900) {
          year = part1;
          month = part2;
          day = part3;
        }
        // If third part is 4 digits, assume MM-DD-YYYY or DD-MM-YYYY
        else if (part3 > 1900) {
          year = part3;
          // Assume MM-DD-YYYY if first part <= 12
          if (part1 <= 12) {
            month = part1;
            day = part2;
          } else {
            // DD-MM-YYYY
            day = part1;
            month = part2;
          }
        }
        // Two digit year - assume MM-DD-YY
        else {
          month = part1;
          day = part2;
          year = part3 <= 30 ? 2000 + part3 : 1900 + part3;
        }
        
        // Validate date
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    } catch (error) {
      console.warn('Date parsing error:', error);
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
