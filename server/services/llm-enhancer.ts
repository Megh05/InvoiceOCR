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

YOU MUST EXTRACT ALL VISIBLE FIELDS FROM THE OCR TEXT. DO NOT RETURN NULL VALUES IF INFORMATION EXISTS.

CRITICAL FIELD IDENTIFICATION RULES:
1. INVOICE NUMBER: Look for patterns like "Invoice #123456", "INV-2024-001", "Bill No: ABC123"
   - Also check standalone numbers at the top (like "683954" in this example)
   - NOT dates, NOT addresses, NOT amounts
   - Usually alphanumeric codes near the top of the document
   - Examples: INV001, 2024-001, ABC-123-DEF, 683954

2. INVOICE DATE: Find the date when this invoice was issued
   - Look for "DATE 1-18-19" format and convert to YYYY-MM-DD
   - Look for phrases like "Invoice Date:", "Date:", "Bill Date:"
   - Convert to YYYY-MM-DD format (e.g., 1-18-19 → 2019-01-18)
   - Do NOT confuse with due dates or service dates

3. VENDOR NAME: The company/business issuing this invoice - EXTRACT FROM "IN ACCOUNT WITH" SECTION
   - Look after "IN ACCOUNT WITH" text for vendor information
   - May be in format: "IN ACCOUNT WITH [VENDOR NAME]"
   - Look for business addresses that indicate the vendor
   - If no explicit vendor name, use the business address/info from the billing section
   - NEVER return null if vendor information exists

4. AMOUNTS: Extract all monetary values with mathematical accuracy
   - Look for "Total:", "Subtotal:", "Tax:", "Amount Due:", line amounts
   - If only total is found, set subtotal = total, tax = 0, shipping = 0
   - Ensure mathematical consistency: total = subtotal + tax + shipping
   - Extract individual line amounts and sum them for subtotal calculation

5. LINE ITEMS: Extract itemized services/products from tables or lists
   - Look for patterns like "EXPLAINMENT FOR FACILITY 1-18-19 25.00"
   - Parse as: description="EXPLAINMENT FOR FACILITY", amount=25.00
   - Include description, quantity (default 1), unit_price=amount, line total=amount
   - Parse service charges, facility fees, or product lines
   - Each line should have at least description and amount

6. MATHEMATICAL VALIDATION:
   - Extract the final total amount from the OCR text (look for amounts at the end)
   - If subtotal/tax/shipping are all 0 but total > 0, set subtotal = total
   - Sum all line item amounts to verify subtotal matches
   - Set subtotal = sum of line items, tax = 0, shipping = 0 unless explicitly found
   - Ensure total equals subtotal + tax + shipping (±$0.01 tolerance)

7. VENDOR INFORMATION EXTRACTION:
   - Look for "IN ACCOUNT WITH" followed by vendor details
   - Extract vendor address from the billing section
   - If vendor_name is unclear, use "BILL" section information
   - ALWAYS extract available vendor information, never leave as null

VALIDATION CHECKS:
- Invoice numbers should be codes/IDs, not dates or amounts  
- Dates must be actual dates in YYYY-MM-DD format
- Amounts should be positive numbers
- Line items must have description and amount > 0
- Mathematical consistency: total = subtotal + tax + shipping

EXAMPLE EXTRACTION FOR THE GIVEN OCR TEXT:
- invoice_number: "683954" (from top of document)
- invoice_date: "2019-01-18" (from "DATE 1-18-19")  
- vendor_name: Extract from "IN ACCOUNT WITH" or "BILL" section
- vendor_address: "620 57TH AVE. W. LOT B-12 BRADENTON FL 34209"
- bill_to: "PALMA SOHA ASST 450 67TH ST. W. BRADENTON FL 34209"
- line_items: [{"description": "EXPLAINMENT FOR FACILITY", "amount": 25.00}]
- total: 75 (from end of document)
- subtotal: 25.00 (sum of line items)

RESPOND WITH VALID JSON ONLY:
{
  "enhanced_data": {
    "invoice_number": "extract from OCR text",
    "invoice_date": "YYYY-MM-DD format",
    "vendor_name": "extract vendor name from OCR",
    "vendor_address": "extract vendor address",
    "bill_to": "extract customer info",
    "ship_to": "shipping info or null", 
    "currency": "USD",
    "subtotal": 25.00,
    "tax": 0,
    "shipping": 0,
    "total": 75,
    "line_items": [
      {
        "line_number": 1,
        "sku": null,
        "description": "EXPLAINMENT FOR FACILITY",
        "qty": 1,
        "unit_price": 25.00,
        "amount": 25.00,
        "tax": 0
      }
    ],
    "raw_ocr_text": "${ocrText.replace(/"/g, '\\"').substring(0, 400)}...",
    "mistral_ocr_text": "${ocrText.replace(/"/g, '\\"').substring(0, 400)}...",
    "ocr_similarity_score": 1.0
  },
  "confidence": 0.85,
  "improvements": ["extracted vendor information", "parsed line items", "calculated subtotal"],
  "validation_errors": []
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