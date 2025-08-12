import { randomUUID } from "crypto";

export interface MistralOCRResponse {
  text: string;
  confidence: number;
  request_id: string;
}

export interface MistralOCRError {
  error: string;
  message: string;
  request_id: string;
}

export class MistralOCRService {
  private apiKey: string;
  private baseUrl: string = "https://api.mistral.ai/v1/ocr";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("MISTRAL_API_KEY is required");
    }
  }

  async extractText(imageUrl?: string, imageBase64?: string): Promise<MistralOCRResponse> {
    const requestId = randomUUID();
    const startTime = Date.now();

    console.log(`[${new Date().toISOString()}] [mistral-ocr] Starting OCR request ${requestId}`);

    if (!imageUrl && !imageBase64) {
      throw new Error("Either imageUrl or imageBase64 must be provided");
    }

    try {
      const payload = {
        ...(imageUrl && { image_url: imageUrl }),
        ...(imageBase64 && { image_base64: imageBase64 }),
        request_id: requestId,
      };

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [mistral-ocr] OCR request ${requestId} completed in ${duration}ms with status ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error(`[${new Date().toISOString()}] [mistral-ocr] OCR request ${requestId} failed:`, errorData);
        
        if (response.status === 503) {
          throw new Error("Mistral OCR service is temporarily unavailable");
        } else if (response.status === 401) {
          throw new Error("Invalid Mistral OCR API key");
        } else {
          throw new Error(`Mistral OCR failed: ${errorData.message || "Unknown error"}`);
        }
      }

      const data = await response.json();
      console.log(`[${new Date().toISOString()}] [mistral-ocr] OCR request ${requestId} extracted ${data.text?.length || 0} characters`);

      return {
        text: data.text || "",
        confidence: data.confidence || 0,
        request_id: requestId,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] [mistral-ocr] OCR request ${requestId} failed after ${duration}ms:`, error);

      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          throw new Error("Mistral OCR service is unreachable");
        }
        throw error;
      }
      throw new Error("Unknown error occurred during OCR processing");
    }
  }

  async verifyText(providedText: string, imageUrl?: string, imageBase64?: string): Promise<{
    mistral_text: string;
    similarity_score: number;
    request_id: string;
  }> {
    const ocrResponse = await this.extractText(imageUrl, imageBase64);
    const similarity = this.calculateSimilarity(providedText, ocrResponse.text);
    
    return {
      mistral_text: ocrResponse.text,
      similarity_score: similarity,
      request_id: ocrResponse.request_id,
    };
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple similarity calculation using Levenshtein distance
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, " ").trim();
    const a = normalize(text1);
    const b = normalize(text2);

    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return Math.max(0, 1 - distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const mistralOCR = new MistralOCRService();
