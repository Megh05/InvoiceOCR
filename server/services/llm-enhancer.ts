import { ConfigService } from "../config";
import { CanonicalInvoice } from "@shared/schema";

export interface LLMEnhancementResult {
  enhanced: CanonicalInvoice;
  confidence: number;
  improvements: string[];
  validation_errors: string[];
}

export interface LLMFieldConfidence {
  field: string;
  original_value: any;
  enhanced_value: any;
  confidence: number;
  reasoning: string;
}

/**
 * LLM-Enhanced Post-Processing Service
 * Uses Mistral AI to intelligently enhance extracted invoice data
 * with high accuracy field extraction and validation
 */
export class LLMEnhancerService {
  private baseUrl: string = "https://api.mistral.ai/v1/chat/completions";
  private model: string = "mistral-large-latest";
  private maxRetries: number = 3;

  async getApiKey(): Promise<string | undefined> {
    const configKey = await ConfigService.getMistralApiKey();
    return configKey || process.env.MISTRAL_API_KEY || undefined;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhance invoice data using Mistral LLM for improved accuracy
   * Only called when confidence is below threshold or validation fails
   */
  async enhanceInvoiceData(
    ocrText: string,
    extractedData: CanonicalInvoice,
    confidence: number
  ): Promise<LLMEnhancementResult> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error("Mistral API key not configured");
    }

    console.log(`[llm-enhancer] Starting LLM enhancement for confidence ${confidence}`);
    console.log(`[llm-enhancer] Input OCR text (first 200 chars): "${ocrText.substring(0, 200)}..."`);
    console.log(`[llm-enhancer] Current extracted invoice_number: "${extractedData.invoice_number}"`);
    console.log(`[llm-enhancer] Current extracted vendor_name: "${extractedData.vendor_name}"`);

    const prompt = this.buildEnhancementPrompt(ocrText, extractedData);
    
    try {
      const response = await this.retryWithBackoff(async () => {
        return await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: "system",
                content: "You are an expert invoice data extraction specialist. Your task is to analyze OCR text and improve extracted invoice data with maximum accuracy. Always respond with valid JSON only."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 2000,
            response_format: { type: "json_object" }
          })
        });
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral API error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error("Empty response from Mistral API");
      }

      // Clean and validate JSON before parsing
      const cleanContent = content.trim();
      let enhancedResult;
      
      console.log("[llm-enhancer] Raw LLM response length:", content.length);
      console.log("[llm-enhancer] First 300 chars of response:", content.substring(0, 300));
      
      try {
        enhancedResult = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error("[llm-enhancer] JSON parse error:", parseError);
        console.error("[llm-enhancer] Raw API response:", content);
        
        // Try to extract JSON from potentially malformed response
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            enhancedResult = JSON.parse(jsonMatch[0]);
          } catch (secondParseError) {
            throw new Error(`Failed to parse LLM response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          }
        } else {
          throw new Error(`No valid JSON found in LLM response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
      }
      // Validate enhanced result structure
      if (!enhancedResult.enhanced_data || typeof enhancedResult.confidence !== 'number') {
        console.error("[llm-enhancer] Invalid LLM response structure:", enhancedResult);
        throw new Error("LLM returned invalid response structure");
      }

      console.log(`[llm-enhancer] LLM enhancement completed with confidence ${enhancedResult.confidence}`);
      console.log(`[llm-enhancer] Enhanced invoice_number: "${enhancedResult.enhanced_data?.invoice_number}"`);
      console.log(`[llm-enhancer] Enhanced invoice_date: "${enhancedResult.enhanced_data?.invoice_date}"`);
      console.log(`[llm-enhancer] Enhanced vendor_name: "${enhancedResult.enhanced_data?.vendor_name}"`);
      console.log(`[llm-enhancer] Enhanced total: ${enhancedResult.enhanced_data?.total}`);

      return {
        enhanced: enhancedResult.enhanced_data,
        confidence: enhancedResult.confidence,
        improvements: enhancedResult.improvements || [],
        validation_errors: enhancedResult.validation_errors || []
      };

    } catch (error) {
      console.error("[llm-enhancer] Enhancement failed:", error);
      throw error;
    }
  }

  private buildEnhancementPrompt(ocrText: string, extractedData: CanonicalInvoice): string {
    return `You are an expert invoice data extraction specialist. Analyze this OCR text and extract accurate invoice information. 

=== OCR TEXT TO ANALYZE ===
${ocrText}

=== CURRENT EXTRACTION (may contain errors) ===
${JSON.stringify(extractedData, null, 2)}

=== EXTRACTION INSTRUCTIONS ===

YOU MUST EXTRACT ALL VISIBLE FIELDS FROM THE OCR TEXT. ANALYZE THE DOCUMENT STRUCTURE AND EXTRACT INFORMATION INTELLIGENTLY.

INTELLIGENT FIELD IDENTIFICATION RULES:

1. INVOICE NUMBER: 
   - Look for explicit labels: "Invoice #", "Invoice Number:", "Bill No:", "Document #", "Ref:", "Statement"
   - Check standalone alphanumeric codes near the top of document
   - Common formats: INV001, 2024-001, ABC-123-DEF, numeric codes like 683954
   - NOT dates, NOT addresses, NOT monetary amounts
   - Usually appears in header section

2. INVOICE DATE:
   - Search for date-related labels: "Date:", "Invoice Date:", "Bill Date:", "Statement Date:"
   - Recognize various date formats: MM/DD/YY, DD-MM-YY, YYYY-MM-DD, written dates
   - Convert all dates to YYYY-MM-DD format
   - Distinguish from due dates, service dates, or payment dates

3. VENDOR IDENTIFICATION (Business issuing the invoice):
   - Look for company names at the top of document
   - Check after labels like: "From:", "Vendor:", "Company:", "Business:"
   - Look for phrases like "IN ACCOUNT WITH", "BILL FROM", "INVOICE FROM"
   - Identify by business suffixes: Inc, LLC, Corp, Ltd, Company, Co
   - May appear in header, letterhead, or billing address section
   - Extract from the address section that represents the billing entity

4. CUSTOMER INFORMATION:
   - Look for "Bill To:", "Customer:", "Ship To:", "TO:" sections
   - Extract name, address, and contact information
   - Distinguish between billing and shipping addresses

5. AMOUNTS AND FINANCIAL DATA:
   - Identify total amount (usually labeled "Total:", "Amount Due:", "Balance Due:")
   - Look for subtotal, tax, shipping, discount labels
   - Extract line-by-line amounts from itemized sections
   - Parse currency symbols and number formats (commas, decimals)
   - Handle various currency notations ($, €, £, etc.)

6. LINE ITEMS EXTRACTION:
   - Identify tabular or list structures containing products/services
   - Common patterns: Description + Amount, Qty + Description + Price + Total
   - Look for service descriptions followed by dates and amounts
   - Extract: description, quantity, unit price, line total, tax per item
   - Handle various table formats and layouts

7. MATHEMATICAL VALIDATION:
   - Calculate subtotal from sum of line items if not explicitly stated
   - Verify total = subtotal + tax + shipping + other charges
   - If only total exists without breakdown, set subtotal = total
   - Ensure mathematical consistency within reasonable tolerance

8. ADDRESSES AND CONTACT INFO:
   - Distinguish between vendor address (bill from) and customer address (bill to)
   - Extract complete address blocks including street, city, state, zip
   - Identify phone numbers, email addresses if present

EXTRACTION APPROACH:
1. Read through the entire OCR text to understand document structure
2. Identify document type (invoice, statement, receipt, bill)
3. Locate header section for vendor and invoice details
4. Find customer/billing information section
5. Extract itemized services/products section
6. Identify total amount and any sub-amounts
7. Calculate missing amounts using mathematical relationships
8. Ensure all extracted data is logically consistent

VALIDATION CHECKS:
- Invoice numbers should be alphanumeric codes, not dates or amounts
- Dates must be valid dates in YYYY-MM-DD format
- Amounts should be positive numbers with proper decimal places
- Line items must have meaningful descriptions and positive amounts
- Mathematical consistency: total ≈ subtotal + tax + shipping
- Vendor and customer information should be complete addresses
- All extracted text should come from the actual OCR content

RESPOND WITH VALID JSON ONLY:
{
  "enhanced_data": {
    "invoice_number": "extracted invoice/document number",
    "invoice_date": "YYYY-MM-DD format",
    "vendor_name": "company name issuing the invoice",
    "vendor_address": "complete vendor address",
    "bill_to": "customer name and address",
    "ship_to": "shipping address if different from billing",
    "currency": "USD",
    "subtotal": 0,
    "tax": 0,
    "shipping": 0,
    "total": 0,
    "line_items": [
      {
        "line_number": 1,
        "sku": "product code if available",
        "description": "service or product description",
        "qty": 1,
        "unit_price": 0,
        "amount": 0,
        "tax": 0
      }
    ],
    "raw_ocr_text": "${ocrText.replace(/"/g, '\\"').substring(0, 400)}...",
    "mistral_ocr_text": "${ocrText.replace(/"/g, '\\"').substring(0, 400)}...",
    "ocr_similarity_score": 1.0
  },
  "confidence": 0.85,
  "improvements": ["list specific improvements made to the extraction"],
  "validation_errors": ["list any validation issues found"]
}`;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === this.maxRetries - 1) throw error;
        
        // Don't retry on auth errors
        if (error instanceof Error && error.message.includes('401')) {
          throw error;
        }
        
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`[llm-enhancer] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
    throw new Error('Max retries exceeded');
  }
}

export const llmEnhancer = new LLMEnhancerService();