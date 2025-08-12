import { randomUUID } from "crypto";
import { ConfigService } from "../config";

export interface MistralOCRResponse {
  text: string;
  confidence: number;
  request_id: string;
  pages?: OCRPage[];
  markdown?: string;
}

export interface OCRPage {
  page_number: number;
  text: string;
  markdown?: string;
  confidence?: number;
  images?: Array<{
    id: string;
    image_base64?: string;
  }>;
}

export interface MistralOCRError {
  error: string;
  message: string;
  request_id: string;
}

export class MistralOCRService {
  private baseUrl: string = "https://api.mistral.ai/v1/ocr";
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second

  async getApiKey(): Promise<string | undefined> {
    const configKey = await ConfigService.getMistralApiKey();
    return configKey || process.env.MISTRAL_API_KEY || undefined;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Don't retry on auth errors or client errors
        if (error instanceof Error) {
          if (error.message.includes('401') || error.message.includes('Invalid API key')) {
            throw error;
          }
        }
        
        const delayMs = this.baseDelay * Math.pow(2, attempt);
        console.log(`[${new Date().toISOString()}] [mistral-ocr] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
        await this.delay(delayMs);
      }
    }
    throw new Error('Max retries exceeded');
  }

  async extractText(imageUrl?: string, imageBase64?: string): Promise<MistralOCRResponse> {
    const requestId = randomUUID();
    const startTime = Date.now();

    console.log(`[${new Date().toISOString()}] [mistral-ocr] Starting OCR request ${requestId}`);

    if (!imageUrl && !imageBase64) {
      throw new Error("Either imageUrl or imageBase64 must be provided");
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      console.warn(`[${new Date().toISOString()}] [mistral-ocr] MISTRAL_API_KEY not available, returning mock response`);
      return {
        text: "Mock OCR response - please provide MISTRAL_API_KEY for real OCR functionality",
        confidence: 0.0,
        request_id: requestId
      };
    }

    try {
      return await this.retryWithExponentialBackoff(async () => {
        let documentUrl: string;
        
        if (imageBase64) {
          // Convert base64 to data URL format expected by Mistral
          const mimeType = this.detectImageMimeType(imageBase64);
          documentUrl = `data:${mimeType};base64,${imageBase64}`;
        } else if (imageUrl) {
          documentUrl = imageUrl;
        } else {
          throw new Error("Either imageUrl or imageBase64 must be provided");
        }

        const payload = {
          model: "mistral-ocr-latest",
          document: {
            type: "document_url",
            document_url: documentUrl,
          },
          include_image_base64: true, // Include images for better processing
        };

        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] [mistral-ocr] OCR request ${requestId} completed in ${duration}ms with status ${response.status}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          console.error(`[${new Date().toISOString()}] [mistral-ocr] OCR request ${requestId} failed:`, errorData);
          
          if (response.status === 503 || response.status === 502) {
            throw new Error("Mistral OCR service is temporarily unavailable");
          } else if (response.status === 401) {
            throw new Error("Invalid Mistral OCR API key");
          } else if (response.status === 429) {
            throw new Error("Rate limit exceeded, retrying...");
          } else {
            throw new Error(`Mistral OCR failed: ${errorData.message || "Unknown error"}`);
          }
        }

        const data = await response.json();
        return this.processOCRResponse(data, requestId);
      });

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

  private processOCRResponse(data: any, requestId: string): MistralOCRResponse {
    // Enhanced processing based on HuggingFace implementation
    const pages: OCRPage[] = [];
    let allText = "";
    let allMarkdown = "";
    
    if (data.pages && Array.isArray(data.pages)) {
      data.pages.forEach((page: any, index: number) => {
        // Extract markdown and plain text
        const markdown = page.markdown || "";
        let text = page.text || "";
        
        // If no plain text, try to extract from markdown
        if (!text && markdown) {
          text = this.extractTextFromMarkdown(markdown);
        }
        
        // Process images in markdown
        let processedMarkdown = markdown;
        if (page.images && Array.isArray(page.images)) {
          page.images.forEach((img: any) => {
            if (img.image_base64) {
              processedMarkdown = processedMarkdown.replace(
                new RegExp(`!\\[${img.id}\\]\\(${img.id}\\)`, 'g'),
                `![${img.id}](data:image/png;base64,${img.image_base64})`
              );
            }
          });
        }
        
        pages.push({
          page_number: index + 1,
          text,
          markdown: processedMarkdown,
          confidence: 0.9,
          images: page.images || []
        });
        
        allText += (allText ? "\n\n" : "") + text;
        allMarkdown += (allMarkdown ? "\n\n" : "") + processedMarkdown;
      });
    }
    
    console.log(`[${new Date().toISOString()}] [mistral-ocr] OCR request ${requestId} extracted ${allText.length} characters from ${pages.length} pages`);

    return {
      text: allText || "No text extracted",
      confidence: pages.length > 0 ? 0.9 : 0.1,
      request_id: requestId,
      pages,
      markdown: allMarkdown
    };
  }

  private extractTextFromMarkdown(markdown: string): string {
    // Simple markdown to text conversion
    return markdown
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code
      .replace(/\n\s*\n/g, '\n') // Clean up extra newlines
      .trim();
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

  private detectImageMimeType(base64String: string): string {
    // Check for common image format signatures in base64
    if (base64String.startsWith('iVBORw0KGgo')) return 'image/png';
    if (base64String.startsWith('/9j/')) return 'image/jpeg';
    if (base64String.startsWith('R0lGODlh')) return 'image/gif';
    if (base64String.startsWith('UklGR')) return 'image/webp';
    if (base64String.startsWith('JVBERi0')) return 'application/pdf';
    
    // Default to JPEG for unknown formats
    return 'image/jpeg';
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
