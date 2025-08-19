import { CanonicalInvoice } from "@shared/schema";
import { FieldConfidence } from './deterministic';

interface KeyValuePair {
  key: string;
  value: string;
  confidence: number;
  position: { line: number; column: number };
  context: string;
  extraction_method: string;
}

interface ExtractionContext {
  lines: string[];
  originalText: string;
  markdownText?: string;
  extractedPairs: KeyValuePair[];
  documentStructure: DocumentStructure;
}

interface DocumentStructure {
  headers: Array<{ text: string; level: number; line: number }>;
  tables: Array<{ start: number; end: number; headers: string[]; rows: string[][] }>;
  sections: Array<{ name: string; start: number; end: number; content: string[] }>;
  keyValueRegions: Array<{ start: number; end: number; type: string }>;
}

/**
 * Enhanced OCR Key-Value Extraction System
 * 
 * This multi-layered extraction system employs various techniques:
 * 1. Document Structure Analysis - Identifies headers, tables, sections
 * 2. Contextual Pattern Matching - Advanced regex with context awareness  
 * 3. Spatial Relationship Analysis - Understands layout and proximity
 * 4. Template-Based Extraction - Adapts to different document formats
 * 5. Machine Learning-Like Scoring - Confidence based on multiple factors
 * 6. Fuzzy Matching - Handles OCR errors and variations
 */
export class EnhancedKeyValueExtractor {
  private confidenceThreshold = 0.75;
  
  // Comprehensive field patterns for different document types
  private fieldPatterns = {
    invoice_number: [
      // Traditional invoice patterns with explicit labels (high confidence)
      { pattern: /(?:invoice|inv)\s*(?:number|#|no\.?)\s*:?\s*([A-Z0-9\-_#]+)/i, confidence: 0.95, context: 'explicit_label' },
      { pattern: /(?:bill|document)\s*(?:number|#|no\.?)\s*:?\s*([A-Z0-9\-_]+)/i, confidence: 0.9, context: 'bill_number' },
      { pattern: /(?:statement|account|ref(?:erence)?)\s*(?:number|#|no\.?)\s*:?\s*([A-Z0-9\-_]+)/i, confidence: 0.85, context: 'statement_ref' },
      
      // Structured format patterns (medium confidence)
      { pattern: /(?:^|\n)\s*([A-Z]{2,}\-\d{4,}\-\d{3,})\s*(?:\n|$)/im, confidence: 0.9, context: 'format_match' },
      { pattern: /(?:^|\n)\s*#([A-Z0-9]{6,})\s*(?:\n|$)/im, confidence: 0.8, context: 'hash_prefixed' },
      
      // Standalone alphanumeric codes (lower confidence, must exclude common words)
      { pattern: /(?:^|\n)\s*([A-Z0-9]{6,})\s*(?:\n|$)/im, confidence: 0.6, context: 'standalone_code', 
        exclude: /^(DATE|TOTAL|AMOUNT|SUBTOTAL|TAX|BALANCE|DUE|INVOICE|BILL|STATEMENT)$/i }
    ],
    
    invoice_date: [
      { pattern: /(?:invoice|bill|statement)\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i, confidence: 0.95, context: 'explicit_label' },
      { pattern: /date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i, confidence: 0.85, context: 'date_label' },
      { pattern: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/g, confidence: 0.7, context: 'date_format' },
      { pattern: /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g, confidence: 0.75, context: 'iso_date' },
      { pattern: /(\d{1,2}\s+\w{3,9}\s+\d{4})/i, confidence: 0.8, context: 'written_date' }
    ],
    
    vendor_name: [
      { pattern: /(?:from|vendor|company|business)\s*:?\s*(.+)/i, confidence: 0.9, context: 'explicit_label' },
      { pattern: /^([A-Z][^0-9\n]{5,50})$/m, confidence: 0.6, context: 'company_format', position: 'top_3_lines' },
      { pattern: /([A-Z&\s]{3,50}(?:INC|LLC|LTD|CORP|CO|COMPANY)\.?)/i, confidence: 0.85, context: 'company_suffix' }
    ],
    
    total_amount: [
      { pattern: /(?:total|amount\s*due|balance\s*due|grand\s*total)\s*:?\s*\$?([0-9,]+\.?\d*)/i, confidence: 0.95, context: 'explicit_total' },
      { pattern: /\$\s*([0-9,]+\.\d{2})\s*(?:\n|$)/g, confidence: 0.7, context: 'currency_amount' },
      { pattern: /([0-9,]+\.\d{2})\s*$/m, confidence: 0.6, context: 'line_end_amount' },
      { pattern: /(?:^|\n).*?([0-9]+\.\d{2})\s*$/m, confidence: 0.5, context: 'document_end_amount' }
    ],
    
    subtotal: [
      { pattern: /(?:subtotal|sub\s*total|net\s*amount)\s*:?\s*\$?([0-9,]+\.?\d*)/i, confidence: 0.9, context: 'explicit_subtotal' }
    ],
    
    tax: [
      { pattern: /(?:tax|vat|gst|hst)\s*:?\s*\$?([0-9,]+\.?\d*)/i, confidence: 0.9, context: 'explicit_tax' },
      { pattern: /(\d+\.?\d*%)\s*tax/i, confidence: 0.8, context: 'tax_percentage' }
    ],
    
    shipping: [
      { pattern: /(?:shipping|freight|delivery)\s*:?\s*\$?([0-9,]+\.?\d*)/i, confidence: 0.9, context: 'explicit_shipping' }
    ],
    
    bill_to: [
      { pattern: /(?:bill\s*to|billed\s*to|customer)\s*:?\s*((?:[^\n]+\n?){1,5})/i, confidence: 0.9, context: 'explicit_label' },
      { pattern: /(?:^|\n)TO\s*:?\s*((?:[^\n]+\n?){1,4})/im, confidence: 0.8, context: 'to_section' }
    ],
    
    line_items: [
      // Enhanced line item patterns with intelligent structure detection
      { pattern: /^\s*(\d+)\s+([A-Za-z][A-Za-z\s\-\.]{5,50})\s+(\d+(?:\.\d{2})?)\s+(\d+(?:\.\d{2})?)\s+([\$€£¥]?\s*\d+[\.,]\d{2})\s*$/gm, confidence: 0.95, context: 'full_table_row' },
      
      // Service with date patterns (various date formats)
      { pattern: /([A-Za-z][A-Za-z\s\-\.]{8,60})\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s+([\$€£¥]?\s*\d+[\.,]\d{2})/gim, confidence: 0.9, context: 'service_with_date' },
      
      // Description with amount (improved pattern)
      { pattern: /^\s*([A-Za-z][A-Za-z\s\-\.\(\)]{8,80})\s+([\$€£¥]?\s*\d+[\.,]\d{2})\s*$/gm, confidence: 0.85, context: 'description_amount' },
      
      // Multi-currency line items
      { pattern: /([A-Za-z][A-Za-z\s\-\.]{5,50}).*?(\d+).*?([\$€£¥])\s*(\d+[\.,]\d{2})/gim, confidence: 0.8, context: 'multi_currency_item' },
      
      // Detailed service descriptions with codes
      { pattern: /([A-Z0-9\-]+)\s+([A-Za-z][A-Za-z\s\-\.]{5,50})\s+([\$€£¥]?\s*\d+[\.,]\d{2})/gim, confidence: 0.87, context: 'coded_service' }
    ]
  };

  public async extractKeyValuePairs(text: string, markdownText?: string): Promise<{
    extracted: CanonicalInvoice;
    confidence: number;
    field_confidences: FieldConfidence[];
    extraction_details: KeyValuePair[];
  }> {
    const context = this.analyzeDocumentStructure(text, markdownText);
    const extractedPairs = await this.performMultiLayerExtraction(context);
    
    // Convert extracted pairs to canonical invoice format
    const invoice = this.buildCanonicalInvoice(extractedPairs, text, markdownText);
    const fieldConfidences = this.calculateFieldConfidences(extractedPairs);
    const overallConfidence = this.calculateOverallConfidence(fieldConfidences);
    
    return {
      extracted: invoice,
      confidence: overallConfidence,
      field_confidences: fieldConfidences,
      extraction_details: extractedPairs
    };
  }

  private analyzeDocumentStructure(text: string, markdownText?: string): ExtractionContext {
    const lines = text.split('\n').map(line => line.trim());
    
    const structure: DocumentStructure = {
      headers: this.identifyHeaders(lines, markdownText),
      tables: this.identifyTables(lines, markdownText),
      sections: this.identifySections(lines),
      keyValueRegions: this.identifyKeyValueRegions(lines)
    };
    
    return {
      lines,
      originalText: text,
      markdownText,
      extractedPairs: [],
      documentStructure: structure
    };
  }

  private async performMultiLayerExtraction(context: ExtractionContext): Promise<KeyValuePair[]> {
    const extractedPairs: KeyValuePair[] = [];
    
    // Layer 1: Pattern-based extraction with context awareness
    const patternPairs = this.extractUsingPatterns(context);
    extractedPairs.push(...patternPairs);
    
    // Layer 2: Markdown table extraction (if available)
    if (context.markdownText) {
      const markdownPairs = this.extractFromMarkdownTables(context);
      extractedPairs.push(...markdownPairs);
    }
    
    // Layer 3: Spatial relationship analysis
    const spatialPairs = this.extractUsingSpatialAnalysis(context);
    extractedPairs.push(...spatialPairs);
    
    // Layer 4: Template-based extraction
    const templatePairs = this.extractUsingTemplateRecognition(context);
    extractedPairs.push(...templatePairs);
    
    // Layer 5: Fuzzy matching for missed fields
    const fuzzyPairs = this.extractUsingFuzzyMatching(context, extractedPairs);
    extractedPairs.push(...fuzzyPairs);
    
    // Deduplicate and rank by confidence
    return this.deduplicateAndRank(extractedPairs);
  }

  private extractUsingPatterns(context: ExtractionContext): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    for (const [fieldName, patterns] of Object.entries(this.fieldPatterns)) {
      for (const patternConfig of patterns) {
        const matches = this.findPatternMatches(
          context.originalText,
          context.lines,
          patternConfig,
          fieldName
        );
        pairs.push(...matches);
      }
    }
    
    return pairs;
  }

  private findPatternMatches(
    text: string,
    lines: string[],
    patternConfig: any,
    fieldName: string
  ): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    const { pattern, confidence, context: extractionContext, position } = patternConfig;
    
    // Apply position constraints if specified
    let searchText = text;
    if (position === 'top_5_lines') {
      searchText = lines.slice(0, 5).join('\n');
    } else if (position === 'top_3_lines') {
      searchText = lines.slice(0, 3).join('\n');
    }
    
    let matches: (RegExpMatchArray | null)[] = [];
    if (pattern.global) {
      let match;
      while ((match = pattern.exec(searchText)) !== null) {
        matches.push(match);
      }
    } else {
      matches = [searchText.match(pattern)];
    }
    
    for (const match of matches) {
      if (match && match[1]) {
        const value = this.cleanExtractedValue(match[1], fieldName);
        
        // Check exclude pattern if specified
        if (patternConfig.exclude && patternConfig.exclude.test(value)) {
          console.log(`[enhanced-extractor] Excluding "${value}" for ${fieldName} due to exclude pattern`);
          continue;
        }
        
        if (this.isValidValue(value, fieldName)) {
          const lineNumber = this.findLineNumber(lines, match[0]);
          
          pairs.push({
            key: fieldName,
            value,
            confidence: this.adjustConfidenceByContext(confidence, match, lines, lineNumber),
            position: { line: lineNumber, column: match.index || 0 },
            context: extractionContext,
            extraction_method: 'pattern_matching'
          });
        }
      }
    }
    
    return pairs;
  }

  private extractFromMarkdownTables(context: ExtractionContext): KeyValuePair[] {
    if (!context.markdownText) return [];
    
    const pairs: KeyValuePair[] = [];
    const tablePattern = /\|([^|\n]+)\|([^|\n]+)\|/g;
    let match;
    
    while ((match = tablePattern.exec(context.markdownText)) !== null) {
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();
      
      const fieldName = this.mapKeyToFieldName(key);
      if (fieldName && this.isValidValue(value, fieldName)) {
        pairs.push({
          key: fieldName,
          value: this.cleanExtractedValue(value, fieldName),
          confidence: 0.9,
          position: { line: 0, column: match.index },
          context: 'markdown_table',
          extraction_method: 'markdown_table'
        });
      }
    }
    
    return pairs;
  }

  private extractUsingSpatialAnalysis(context: ExtractionContext): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    // Enhanced spatial analysis with intelligent context detection
    for (let i = 0; i < context.lines.length; i++) {
      const line = context.lines[i];
      
      // Enhanced colon-separated pattern detection
      const colonMatches = this.findColonSeparatedPairs(line, i);
      pairs.push(...colonMatches);
      
      // Tab or multi-space separated key-value pairs
      const tabMatches = this.findTabSeparatedPairs(line, i);
      pairs.push(...tabMatches);
      
      // Adjacent line relationships (key on one line, value on next)
      if (i < context.lines.length - 1) {
        const adjacentPairs = this.findAdjacentLinePairs(context.lines, i);
        pairs.push(...adjacentPairs);
      }
      
      // Table-like structures detection
      const tablePairs = this.extractFromTableStructure(context.lines, i);
      pairs.push(...tablePairs);
      
      // Proximity-based field detection (value near field names)
      const proximityPairs = this.findProximityBasedPairs(context.lines, i);
      pairs.push(...proximityPairs);
    }
    
    return pairs;
  }

  private extractUsingTemplateRecognition(context: ExtractionContext): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    // Detect document type and apply specific extraction rules
    const documentType = this.detectDocumentType(context);
    
    switch (documentType) {
      case 'invoice':
        pairs.push(...this.extractInvoiceSpecificFields(context));
        break;
      case 'statement':
        pairs.push(...this.extractStatementSpecificFields(context));
        break;
      case 'receipt':
        pairs.push(...this.extractReceiptSpecificFields(context));
        break;
    }
    
    return pairs;
  }

  private extractUsingFuzzyMatching(context: ExtractionContext, existingPairs: KeyValuePair[]): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    const extractedFields = new Set(existingPairs.map(p => p.key));
    
    // Try to find missing critical fields using fuzzy matching
    const criticalFields = ['invoice_number', 'invoice_date', 'vendor_name', 'total_amount'];
    
    for (const field of criticalFields) {
      if (!extractedFields.has(field)) {
        const fuzzyMatch = this.findFuzzyMatch(context, field);
        if (fuzzyMatch) {
          pairs.push(fuzzyMatch);
        }
      }
    }
    
    return pairs;
  }

  private findFuzzyMatch(context: ExtractionContext, fieldName: string): KeyValuePair | null {
    // Implementation for fuzzy matching using edit distance and context clues
    const synonyms = this.getFieldSynonyms(fieldName);
    
    for (const line of context.lines) {
      for (const synonym of synonyms) {
        if (this.calculateEditDistance(line.toLowerCase(), synonym.toLowerCase()) <= 2) {
          // Found a potential match, extract value
          const value = this.extractValueFromFuzzyMatch(line, fieldName);
          if (value) {
            return {
              key: fieldName,
              value,
              confidence: 0.6,
              position: { line: context.lines.indexOf(line), column: 0 },
              context: 'fuzzy_match',
              extraction_method: 'fuzzy_matching'
            };
          }
        }
      }
    }
    
    return null;
  }

  // Enhanced spatial analysis helper methods
  private findColonSeparatedPairs(line: string, lineIndex: number): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    // Enhanced colon pattern matching with better key detection
    const colonMatches = line.match(/([^:]{2,40}):\s*([^:]{1,100})(?=\s*$|\s*\||\s*;)/g);
    
    if (colonMatches) {
      for (const match of colonMatches) {
        const [, key, value] = match.match(/([^:]+):\s*(.+)/) || [];
        if (key && value) {
          const cleanKey = key.trim();
          const cleanValue = value.trim();
          const fieldName = this.mapKeyToFieldName(cleanKey);
          
          if (fieldName && this.isValidValue(cleanValue, fieldName)) {
            pairs.push({
              key: fieldName,
              value: this.cleanExtractedValue(cleanValue, fieldName),
              confidence: 0.85,
              position: { line: lineIndex, column: line.indexOf(key) },
              context: 'colon_separated_enhanced',
              extraction_method: 'spatial_analysis'
            });
          }
        }
      }
    }
    
    return pairs;
  }

  private findTabSeparatedPairs(line: string, lineIndex: number): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    // Detect tab or multi-space separated values
    const parts = line.split(/\t|\s{3,}/).filter(part => part.trim().length > 0);
    
    if (parts.length === 2) {
      const [potentialKey, potentialValue] = parts;
      const fieldName = this.mapKeyToFieldName(potentialKey.trim());
      
      if (fieldName && this.isValidValue(potentialValue.trim(), fieldName)) {
        pairs.push({
          key: fieldName,
          value: this.cleanExtractedValue(potentialValue.trim(), fieldName),
          confidence: 0.8,
          position: { line: lineIndex, column: 0 },
          context: 'tab_separated',
          extraction_method: 'spatial_analysis'
        });
      }
    }
    
    return pairs;
  }

  private findAdjacentLinePairs(lines: string[], lineIndex: number): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    if (lineIndex < lines.length - 1) {
      const currentLine = lines[lineIndex].trim();
      const nextLine = lines[lineIndex + 1].trim();
      
      // Check if current line looks like a field label
      const fieldName = this.mapKeyToFieldName(currentLine);
      
      if (fieldName && this.isValidValue(nextLine, fieldName) && !this.mapKeyToFieldName(nextLine)) {
        pairs.push({
          key: fieldName,
          value: this.cleanExtractedValue(nextLine, fieldName),
          confidence: 0.75,
          position: { line: lineIndex + 1, column: 0 },
          context: 'adjacent_lines_enhanced',
          extraction_method: 'spatial_analysis'
        });
      }
    }
    
    return pairs;
  }

  private extractFromTableStructure(lines: string[], lineIndex: number): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    // Look for table-like structures with consistent column spacing
    const line = lines[lineIndex];
    
    // Detect lines that might be table rows (multiple values separated by consistent spacing)
    const tablePattern = /^\s*([A-Za-z][\w\s]{3,30})\s{3,}([\d.,]+)\s{3,}([\d.,]+)\s*$/;
    const match = line.match(tablePattern);
    
    if (match) {
      const [, description, value1, value2] = match;
      
      // Try to determine what these values represent based on context
      if (this.looksLikeAmount(value1) || this.looksLikeAmount(value2)) {
        const amount = this.looksLikeAmount(value2) ? value2 : value1;
        
        pairs.push({
          key: 'line_items',
          value: JSON.stringify({ description: description.trim(), amount: amount }),
          confidence: 0.8,
          position: { line: lineIndex, column: 0 },
          context: 'table_structure',
          extraction_method: 'spatial_analysis'
        });
      }
    }
    
    return pairs;
  }

  private findProximityBasedPairs(lines: string[], lineIndex: number): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    const line = lines[lineIndex];
    
    // Look for values that appear near known field keywords
    const proximityPatterns = [
      { keywords: ['total', 'amount', 'due'], field: 'total_amount', pattern: /([\$€£¥]?\s*[\d,]+\.d{2})/ },
      { keywords: ['date'], field: 'invoice_date', pattern: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/ },
      { keywords: ['invoice', 'bill', 'ref'], field: 'invoice_number', pattern: /([A-Z0-9\-]{4,15})/ }
    ];
    
    for (const { keywords, field, pattern } of proximityPatterns) {
      const hasKeyword = keywords.some(keyword => 
        line.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        const matches = line.match(pattern);
        if (matches) {
          pairs.push({
            key: field,
            value: this.cleanExtractedValue(matches[1], field),
            confidence: 0.7,
            position: { line: lineIndex, column: matches.index || 0 },
            context: 'proximity_based',
            extraction_method: 'spatial_analysis'
          });
        }
      }
    }
    
    return pairs;
  }

  // Utility methods
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.calculateEditDistance(shorter, longer);
    return (longer.length - editDistance) / longer.length;
  }

  private looksLikeAmount(value: string): boolean {
    return /^[\$€£¥]?\s*[\d,]+\.\d{2}$/.test(value.trim());
  }

  // Helper methods for document structure analysis
  private identifyHeaders(lines: string[], markdownText?: string): Array<{ text: string; level: number; line: number }> {
    const headers: Array<{ text: string; level: number; line: number }> = [];
    
    if (markdownText) {
      // Extract markdown headers
      const headerPattern = /^(#{1,6})\s+(.+)$/gm;
      let match;
      while ((match = headerPattern.exec(markdownText)) !== null) {
        headers.push({
          text: match[2],
          level: match[1].length,
          line: 0 // Would need more sophisticated mapping
        });
      }
    }
    
    // Extract text-based headers (all caps, short lines, etc.)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.looksLikeHeader(line)) {
        headers.push({
          text: line,
          level: 1,
          line: i
        });
      }
    }
    
    return headers;
  }

  private identifyTables(lines: string[], markdownText?: string): Array<{ start: number; end: number; headers: string[]; rows: string[][] }> {
    const tables: Array<{ start: number; end: number; headers: string[]; rows: string[][] }> = [];
    
    if (markdownText) {
      // Extract markdown tables
      const tablePattern = /(\|[^|\n]+\|[^|\n]+\|[\s\S]*?)(?=\n\n|\n$|$)/g;
      let match;
      while ((match = tablePattern.exec(markdownText)) !== null) {
        const tableText = match[1];
        const rows = tableText.split('\n').map(row => 
          row.split('|').map(cell => cell.trim()).filter(cell => cell)
        );
        
        if (rows.length > 0) {
          tables.push({
            start: 0,
            end: 0,
            headers: rows[0] || [],
            rows: rows.slice(1)
          });
        }
      }
    }
    
    return tables;
  }

  private identifySections(lines: string[]): Array<{ name: string; start: number; end: number; content: string[] }> {
    const sections: Array<{ name: string; start: number; end: number; content: string[] }> = [];
    const sectionKeywords = ['bill to', 'ship to', 'from', 'vendor', 'items', 'total', 'terms'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      for (const keyword of sectionKeywords) {
        if (line.includes(keyword)) {
          // Find section boundaries
          let end = i + 1;
          while (end < lines.length && !this.isNewSection(lines[end])) {
            end++;
          }
          
          sections.push({
            name: keyword,
            start: i,
            end: end,
            content: lines.slice(i + 1, end)
          });
        }
      }
    }
    
    return sections;
  }

  private identifyKeyValueRegions(lines: string[]): Array<{ start: number; end: number; type: string }> {
    const regions: Array<{ start: number; end: number; type: string }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for regions with colon-separated key-value pairs
      if (line.includes(':')) {
        let start = i;
        let end = i;
        
        // Extend region to include adjacent colon-separated lines
        while (end + 1 < lines.length && lines[end + 1].includes(':')) {
          end++;
        }
        
        if (end > start) {
          regions.push({
            start,
            end,
            type: 'colon_separated'
          });
        }
      }
    }
    
    return regions;
  }

  // Enhanced field mapping with fuzzy matching and context awareness
  private mapKeyToFieldName(key: string): string | null {
    const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ');
    
    // Comprehensive field mappings with fuzzy matching
    const keyMappings: { [key: string]: string } = {
      // Invoice number variants
      'invoice number': 'invoice_number', 'invoice no': 'invoice_number', 'invoice num': 'invoice_number',
      'inv number': 'invoice_number', 'inv no': 'invoice_number', 'inv num': 'invoice_number',
      'bill number': 'invoice_number', 'bill no': 'invoice_number', 'document number': 'invoice_number',
      'doc number': 'invoice_number', 'doc no': 'invoice_number', 'reference number': 'invoice_number',
      'ref number': 'invoice_number', 'ref no': 'invoice_number', 'reference': 'invoice_number', 'ref': 'invoice_number',
      'order number': 'invoice_number', 'order no': 'invoice_number', 'po number': 'invoice_number',
      'statement number': 'invoice_number', 'account number': 'invoice_number', 'transaction id': 'invoice_number',
      
      // Date variants
      'invoice date': 'invoice_date', 'bill date': 'invoice_date', 'statement date': 'invoice_date',
      'date': 'invoice_date', 'issue date': 'invoice_date', 'created date': 'invoice_date',
      'transaction date': 'invoice_date', 'service date': 'invoice_date',
      
      // Vendor/company variants
      'vendor': 'vendor_name', 'vendor name': 'vendor_name', 'company': 'vendor_name', 'company name': 'vendor_name',
      'business': 'vendor_name', 'business name': 'vendor_name', 'supplier': 'vendor_name', 'provider': 'vendor_name',
      'merchant': 'vendor_name', 'seller': 'vendor_name', 'from': 'vendor_name', 'billed by': 'vendor_name',
      'organization': 'vendor_name', 'firm': 'vendor_name', 'enterprise': 'vendor_name',
      
      // Amount variants
      'total': 'total_amount', 'total amount': 'total_amount', 'grand total': 'total_amount',
      'amount due': 'total_amount', 'balance due': 'total_amount', 'amount payable': 'total_amount',
      'final amount': 'total_amount', 'balance': 'total_amount', 'payable amount': 'total_amount',
      'total due': 'total_amount', 'amount owing': 'total_amount',
      
      // Subtotal variants
      'subtotal': 'subtotal', 'sub total': 'subtotal', 'net amount': 'subtotal',
      'net total': 'subtotal', 'base amount': 'subtotal', 'before tax': 'subtotal',
      
      // Tax variants
      'tax': 'tax', 'vat': 'tax', 'gst': 'tax', 'hst': 'tax', 'sales tax': 'tax',
      'tax amount': 'tax', 'vat amount': 'tax', 'gst amount': 'tax',
      
      // Shipping variants
      'shipping': 'shipping', 'shipping cost': 'shipping', 'shipping fee': 'shipping',
      'freight': 'shipping', 'delivery': 'shipping', 'delivery fee': 'shipping',
      'handling': 'shipping', 'postage': 'shipping',
      
      // Bill to variants
      'bill to': 'bill_to', 'billed to': 'bill_to', 'customer': 'bill_to',
      'client': 'bill_to', 'buyer': 'bill_to', 'purchaser': 'bill_to', 'to': 'bill_to'
    };
    
    // Direct mapping first
    if (keyMappings[cleanKey]) {
      return keyMappings[cleanKey];
    }
    
    // Fuzzy matching for partial matches
    for (const [pattern, fieldName] of Object.entries(keyMappings)) {
      if (this.calculateSimilarity(cleanKey, pattern) > 0.8) {
        return fieldName;
      }
    }
    
    // Partial word matching
    for (const [pattern, fieldName] of Object.entries(keyMappings)) {
      const patternWords = pattern.split(' ');
      const keyWords = cleanKey.split(' ');
      
      let matchCount = 0;
      for (const patternWord of patternWords) {
        if (keyWords.some(keyWord => keyWord.includes(patternWord) || patternWord.includes(keyWord))) {
          matchCount++;
        }
      }
      
      if (matchCount / patternWords.length > 0.6) {
        return fieldName;
      }
    }
    
    return null;
  }

  private isValidValue(value: string, fieldName: string): boolean {
    if (!value || value.trim().length === 0) return false;
    
    switch (fieldName) {
      case 'invoice_number':
        return /[A-Z0-9]/.test(value) && value.length >= 3;
      case 'invoice_date':
        return /\d/.test(value);
      case 'vendor_name':
        return value.length >= 3 && !/^\d+$/.test(value);
      case 'total_amount':
      case 'subtotal':
      case 'tax':
      case 'shipping':
        return /\d/.test(value.replace(/[^\d.]/g, ''));
      default:
        return true;
    }
  }

  private cleanExtractedValue(value: string, fieldName: string): string {
    let cleaned = value.trim();
    
    switch (fieldName) {
      case 'total_amount':
      case 'subtotal':
      case 'tax':
      case 'shipping':
        // Remove currency symbols and extract numeric value
        cleaned = cleaned.replace(/[\$€£¥,]/g, '');
        const numMatch = cleaned.match(/(\d+\.?\d*)/);
        return numMatch ? numMatch[1] : cleaned;
      
      case 'invoice_date':
        // Normalize date format
        return this.normalizeDateString(cleaned) || cleaned;
      
      default:
        return cleaned;
    }
  }

  // Confidence calculation methods
  private adjustConfidenceByContext(
    baseConfidence: number,
    match: RegExpMatchArray,
    lines: string[],
    lineNumber: number
  ): number {
    let adjustedConfidence = baseConfidence;
    
    // Boost confidence if found in expected locations
    if (lineNumber < 5) adjustedConfidence += 0.1; // Top of document
    if (match[0].includes(':')) adjustedConfidence += 0.05; // Explicit key-value format
    
    // Reduce confidence for very short matches
    if (match[1] && match[1].length < 3) adjustedConfidence -= 0.2;
    
    return Math.min(0.99, Math.max(0.1, adjustedConfidence));
  }

  private calculateFieldConfidences(pairs: KeyValuePair[]): FieldConfidence[] {
    const fieldConfidences: FieldConfidence[] = [];
    const grouped = this.groupPairsByField(pairs);
    
    for (const [fieldName, fieldPairs] of Object.entries(grouped)) {
      if (fieldPairs.length > 0) {
        // Use the highest confidence match for each field
        const bestMatch = fieldPairs.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
        
        fieldConfidences.push({
          field: fieldName,
          value: bestMatch.value,
          confidence: bestMatch.confidence,
          source: bestMatch.extraction_method
        });
      }
    }
    
    return fieldConfidences;
  }

  private calculateOverallConfidence(fieldConfidences: FieldConfidence[]): number {
    if (fieldConfidences.length === 0) return 0;
    
    const criticalFields = ['invoice_number', 'vendor_name', 'total_amount'];
    const criticalFieldsFound = fieldConfidences.filter(fc => 
      criticalFields.includes(fc.field)
    );
    
    // Weight critical fields more heavily
    const criticalWeight = 0.7;
    const otherWeight = 0.3;
    
    const criticalScore = criticalFieldsFound.length > 0 ?
      criticalFieldsFound.reduce((sum, fc) => sum + fc.confidence, 0) / criticalFieldsFound.length : 0;
    
    const otherFields = fieldConfidences.filter(fc => 
      !criticalFields.includes(fc.field)
    );
    const otherScore = otherFields.length > 0 ?
      otherFields.reduce((sum, fc) => sum + fc.confidence, 0) / otherFields.length : 0;
    
    return (criticalScore * criticalWeight) + (otherScore * otherWeight);
  }

  // Document type detection
  private detectDocumentType(context: ExtractionContext): string {
    const text = context.originalText.toLowerCase();
    
    if (text.includes('invoice') || text.includes('bill')) return 'invoice';
    if (text.includes('statement') || text.includes('account')) return 'statement';
    if (text.includes('receipt') || text.includes('purchase')) return 'receipt';
    
    return 'unknown';
  }

  // Template-specific extraction methods
  private extractInvoiceSpecificFields(context: ExtractionContext): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    // Invoice-specific patterns and logic
    // Look for line items in tabular format
    const lineItems = this.extractLineItems(context);
    if (lineItems.length > 0) {
      pairs.push({
        key: 'line_items',
        value: JSON.stringify(lineItems),
        confidence: 0.8,
        position: { line: 0, column: 0 },
        context: 'invoice_template',
        extraction_method: 'template_recognition'
      });
    }
    
    return pairs;
  }

  private extractStatementSpecificFields(context: ExtractionContext): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    // Statement-specific patterns
    // Look for account information, period dates, etc.
    
    return pairs;
  }

  private extractReceiptSpecificFields(context: ExtractionContext): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    
    // Receipt-specific patterns
    // Look for store information, transaction details, etc.
    
    return pairs;
  }

  // Utility methods
  private deduplicateAndRank(pairs: KeyValuePair[]): KeyValuePair[] {
    const grouped = this.groupPairsByField(pairs);
    const deduplicated: KeyValuePair[] = [];
    
    for (const fieldPairs of Object.values(grouped)) {
      // Sort by confidence and take the best match
      fieldPairs.sort((a, b) => b.confidence - a.confidence);
      deduplicated.push(fieldPairs[0]);
    }
    
    return deduplicated;
  }

  private groupPairsByField(pairs: KeyValuePair[]): { [key: string]: KeyValuePair[] } {
    const grouped: { [key: string]: KeyValuePair[] } = {};
    
    for (const pair of pairs) {
      if (!grouped[pair.key]) {
        grouped[pair.key] = [];
      }
      grouped[pair.key].push(pair);
    }
    
    return grouped;
  }

  private buildCanonicalInvoice(pairs: KeyValuePair[], originalText: string, markdownText?: string): CanonicalInvoice {
    const pairMap = new Map(pairs.map(p => [p.key, p.value]));
    
    return {
      invoice_number: pairMap.get('invoice_number') || undefined,
      invoice_date: pairMap.get('invoice_date') || undefined,
      vendor_name: pairMap.get('vendor_name') || undefined,
      vendor_address: pairMap.get('vendor_address') || undefined,
      bill_to: pairMap.get('bill_to') || undefined,
      ship_to: pairMap.get('ship_to') || undefined,
      currency: pairMap.get('currency') || 'USD',
      subtotal: parseFloat(pairMap.get('subtotal') || '0') || 0,
      tax: parseFloat(pairMap.get('tax') || '0') || 0,
      shipping: parseFloat(pairMap.get('shipping') || '0') || 0,
      total: parseFloat(pairMap.get('total_amount') || '0') || 0,
      line_items: this.parseLineItems(pairMap.get('line_items')),
      raw_ocr_text: originalText,
      mistral_ocr_text: markdownText || originalText,
      ocr_similarity_score: 1.0,
      category: 'General'
    };
  }

  private parseLineItems(lineItemsJson?: string): any[] {
    if (!lineItemsJson) return [];
    
    try {
      return JSON.parse(lineItemsJson);
    } catch {
      return [];
    }
  }

  private findLineItemMatches(text: string, patternConfig: any): any[] {
    const items: any[] = [];
    const { pattern, confidence, context } = patternConfig;
    
    let matches = [];
    let match;
    
    // Reset regex global flag
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(text)) !== null) {
      let lineItem: any = {
        line_number: items.length + 1,
        sku: null,
        qty: 1,
        unit_price: 0,
        amount: 0,
        tax: 0
      };
      
      switch (context) {
        case 'service_with_date':
          // Pattern: "DESCRIPTION 1-18-19 25.00"
          lineItem.description = match[1].trim();
          lineItem.amount = parseFloat(match[3]) || 0;
          lineItem.unit_price = lineItem.amount;
          break;
          
        case 'description_amount':
          // Pattern: "Service description 25.00"
          lineItem.description = match[1].trim();
          lineItem.amount = parseFloat(match[2]) || 0;
          lineItem.unit_price = lineItem.amount;
          break;
          
        case 'qty_desc_price_total':
          // Pattern: "1 Service description 25.00 25.00"
          lineItem.qty = parseInt(match[1]) || 1;
          lineItem.description = match[2].trim();
          lineItem.unit_price = parseFloat(match[3]) || 0;
          lineItem.amount = parseFloat(match[4]) || 0;
          break;
      }
      
      if (lineItem.description && lineItem.amount > 0) {
        items.push(lineItem);
      }
    }
    
    return items;
  }

  private extractLineItems(context: ExtractionContext): any[] {
    const items: any[] = [];
    
    // Extract line items using the pattern matching approach
    const lineItemPatterns = this.fieldPatterns.line_items;
    
    for (const patternConfig of lineItemPatterns) {
      const matches = this.findLineItemMatches(context.originalText, patternConfig);
      items.push(...matches);
    }
    
    // Look for tabular data in the document  
    for (const table of context.documentStructure.tables) {
      for (const row of table.rows) {
        if (row.length >= 3) {
          const description = row[0];
          const qty = this.parseNumber(row[1]) || 1;
          const amount = this.parseNumber(row[row.length - 1]) || 0;
          
          if (description && description.length > 3) {
            items.push({
              line_number: items.length + 1,
              sku: null,
              description,
              qty,
              unit_price: qty > 0 ? amount / qty : amount,
              amount,
              tax: 0
            });
          }
        }
      }
    }
    
    return items;
  }

  // Helper utility methods
  private findLineNumber(lines: string[], searchText: string): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i;
      }
    }
    return 0;
  }

  private looksLikeHeader(line: string): boolean {
    return line.length > 0 && 
           line.length < 50 && 
           line === line.toUpperCase() && 
           !line.includes(':') &&
           !/^\d+/.test(line);
  }

  private isNewSection(line: string): boolean {
    const sectionIndicators = ['bill to', 'ship to', 'total', 'subtotal', 'terms', 'notes'];
    return sectionIndicators.some(indicator => 
      line.toLowerCase().includes(indicator)
    );
  }

  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private getFieldSynonyms(fieldName: string): string[] {
    const synonyms: { [key: string]: string[] } = {
      'invoice_number': ['invoice', 'inv', 'number', 'ref', 'reference'],
      'invoice_date': ['date', 'invoice date', 'bill date'],
      'vendor_name': ['vendor', 'company', 'from', 'business'],
      'total_amount': ['total', 'amount', 'due', 'balance']
    };
    
    return synonyms[fieldName] || [];
  }

  private extractValueFromFuzzyMatch(line: string, fieldName: string): string | null {
    // Extract value from a line that fuzzy-matched a field name
    const parts = line.split(/[:=]/);
    if (parts.length > 1) {
      return parts[1].trim();
    }
    
    // Try to extract based on field type
    if (fieldName === 'total_amount') {
      const amountMatch = line.match(/(\d+\.?\d*)/);
      return amountMatch ? amountMatch[1] : null;
    }
    
    return null;
  }

  private parseNumber(value: string): number | null {
    if (!value) return null;
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  private normalizeDateString(dateStr: string): string | null {
    // Normalize various date formats to ISO format
    const datePatterns = [
      { pattern: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, format: 'MM/DD/YYYY' },
      { pattern: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/, format: 'MM/DD/YY' },
      { pattern: /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, format: 'YYYY/MM/DD' }
    ];
    
    for (const { pattern, format } of datePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        let year = parseInt(match[3]);
        let month = parseInt(match[1]);
        let day = parseInt(match[2]);
        
        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        // Swap month/day for different formats
        if (format === 'YYYY/MM/DD') {
          [month, day] = [parseInt(match[2]), parseInt(match[3])];
        }
        
        // Validate date
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        }
      }
    }
    
    return null;
  }
}

export const enhancedKeyValueExtractor = new EnhancedKeyValueExtractor();