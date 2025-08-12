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

      const enhancedResult = JSON.parse(content);
      console.log(`[llm-enhancer] LLM enhancement completed with confidence ${enhancedResult.confidence}`);

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
    return `Analyze this OCR text and improve the extracted invoice data. Focus on accuracy and completeness.

OCR TEXT:
${ocrText}

CURRENT EXTRACTED DATA:
${JSON.stringify(extractedData, null, 2)}

TASK:
1. Carefully read the OCR text and identify all invoice fields
2. Compare with current extracted data and identify errors or missing information
3. Extract/correct these fields with high accuracy:
   - invoice_number: Look for invoice #, inv #, document number
   - invoice_date: Find the invoice/bill date (format: YYYY-MM-DD)
   - vendor_name: Company/business name providing the service
   - vendor_address: Full vendor address
   - bill_to / ship_to: Customer address information
   - currency: Currency code (USD, EUR, etc.)
   - subtotal, tax, shipping, total: All monetary amounts
   - line_items: Service/product lines with qty, unit_price, amount

4. Validate that totals are mathematically correct
5. Ensure dates are in YYYY-MM-DD format
6. Provide confidence score (0.0-1.0) based on OCR text clarity

RESPONSE FORMAT (JSON only):
{
  "enhanced_data": {
    "invoice_number": "string or null",
    "invoice_date": "YYYY-MM-DD or null",
    "vendor_name": "string or null",
    "vendor_address": "string or null", 
    "bill_to": "string or null",
    "ship_to": "string or null",
    "currency": "string",
    "subtotal": number,
    "tax": number,
    "shipping": number,
    "total": number,
    "line_items": [
      {
        "line_number": number,
        "sku": "string or null",
        "description": "string",
        "qty": number,
        "unit_price": number,
        "amount": number,
        "tax": number
      }
    ],
    "raw_ocr_text": "${ocrText.substring(0, 500)}...",
    "mistral_ocr_text": "${ocrText.substring(0, 500)}...",
    "ocr_similarity_score": 1.0
  },
  "confidence": number,
  "improvements": ["list of improvements made"],
  "validation_errors": ["list of validation issues found"]
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