import { InvoiceTemplate, TemplateMatch, CanonicalInvoice } from "@/types/invoice";

// Built-in invoice templates for common vendors and formats
const BUILT_IN_TEMPLATES: InvoiceTemplate[] = [
  {
    id: "amazon-business",
    name: "Amazon Business",
    category: "E-commerce",
    vendor_patterns: [
      "amazon",
      "amazon.com",
      "amazon business",
      "amzn.com"
    ],
    field_patterns: {
      invoice_number: ["order #", "order number", "invoice #"],
      total: ["order total", "total:", "amount due"],
      date: ["order date", "invoice date"]
    },
    layout_indicators: [
      "sold by amazon",
      "order summary",
      "billing address",
      "payment method"
    ],
    confidence_threshold: 0.7
  },
  {
    id: "microsoft-office",
    name: "Microsoft Office 365",
    category: "Software/SaaS",
    vendor_patterns: [
      "microsoft",
      "microsoft corporation",
      "office 365",
      "azure"
    ],
    field_patterns: {
      invoice_number: ["invoice number", "invoice #"],
      total: ["total amount", "amount due", "total"],
      date: ["invoice date", "billing period"]
    },
    layout_indicators: [
      "microsoft corporation",
      "billing period",
      "subscription",
      "service period"
    ],
    confidence_threshold: 0.75
  },
  {
    id: "google-workspace",
    name: "Google Workspace",
    category: "Software/SaaS",
    vendor_patterns: [
      "google",
      "google llc",
      "google workspace",
      "gsuite"
    ],
    field_patterns: {
      invoice_number: ["invoice number", "invoice id"],
      total: ["total", "amount due"],
      date: ["invoice date", "service period"]
    },
    layout_indicators: [
      "google llc",
      "workspace",
      "service period",
      "billing account"
    ],
    confidence_threshold: 0.75
  },
  {
    id: "aws-invoice",
    name: "Amazon Web Services",
    category: "Cloud/Infrastructure",
    vendor_patterns: [
      "amazon web services",
      "aws",
      "amazon.com, inc"
    ],
    field_patterns: {
      invoice_number: ["invoice number", "invoice #"],
      total: ["total amount due", "amount due", "invoice total"],
      date: ["invoice date", "billing period"]
    },
    layout_indicators: [
      "amazon web services",
      "usage charges",
      "billing period",
      "aws account"
    ],
    confidence_threshold: 0.8
  },
  {
    id: "utility-bill",
    name: "Utility Bill",
    category: "Utilities",
    vendor_patterns: [
      "electric",
      "electricity",
      "gas company",
      "water department",
      "utility"
    ],
    field_patterns: {
      invoice_number: ["account number", "bill number", "reference"],
      total: ["amount due", "total amount", "balance due"],
      date: ["bill date", "service period", "due date"]
    },
    layout_indicators: [
      "account number",
      "service period",
      "meter reading",
      "previous balance"
    ],
    confidence_threshold: 0.65
  },
  {
    id: "telecom-invoice",
    name: "Telecommunications",
    category: "Telecommunications",
    vendor_patterns: [
      "verizon",
      "at&t",
      "t-mobile",
      "sprint",
      "telecom",
      "wireless"
    ],
    field_patterns: {
      invoice_number: ["account number", "invoice number"],
      total: ["total due", "amount due", "current charges"],
      date: ["bill date", "service period"]
    },
    layout_indicators: [
      "wireless service",
      "monthly charges",
      "data usage",
      "phone number"
    ],
    confidence_threshold: 0.7
  },
  {
    id: "generic-business",
    name: "Generic Business Invoice",
    category: "General",
    vendor_patterns: [
      "invoice",
      "bill",
      "statement"
    ],
    field_patterns: {
      invoice_number: ["invoice number", "invoice #", "inv #", "number"],
      total: ["total", "amount due", "balance due", "grand total"],
      date: ["date", "invoice date", "bill date"]
    },
    layout_indicators: [
      "bill to",
      "ship to",
      "description",
      "quantity",
      "unit price"
    ],
    confidence_threshold: 0.5
  }
];

export class TemplateRecognitionService {
  private templates: InvoiceTemplate[];

  constructor(customTemplates: InvoiceTemplate[] = []) {
    this.templates = [...BUILT_IN_TEMPLATES, ...customTemplates];
  }

  /**
   * Analyze OCR text and match against known invoice templates
   */
  recognizeTemplate(ocrText: string, extractedData?: CanonicalInvoice): TemplateMatch | null {
    const normalizedText = this.normalizeText(ocrText);
    let bestMatch: TemplateMatch | null = null;
    let highestScore = 0;

    for (const template of this.templates) {
      const score = this.calculateTemplateScore(normalizedText, extractedData, template);
      
      if (score > template.confidence_threshold && score > highestScore) {
        highestScore = score;
        bestMatch = {
          template_id: template.id,
          template_name: template.name,
          confidence: score,
          matched_patterns: this.getMatchedPatterns(normalizedText, template)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): InvoiceTemplate | null {
    return this.templates.find(t => t.id === templateId) || null;
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): InvoiceTemplate[] {
    return [...this.templates];
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): InvoiceTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  /**
   * Auto-categorize invoice based on template match
   */
  categorizeInvoice(templateMatch: TemplateMatch | null, extractedData?: CanonicalInvoice): string {
    if (templateMatch) {
      const template = this.getTemplate(templateMatch.template_id);
      if (template) {
        return template.category;
      }
    }

    // Fallback categorization based on content analysis
    if (extractedData?.vendor_name) {
      const vendorLower = extractedData.vendor_name.toLowerCase();
      
      if (vendorLower.includes('amazon') || vendorLower.includes('aws')) {
        return 'E-commerce/Cloud';
      }
      if (vendorLower.includes('microsoft') || vendorLower.includes('google')) {
        return 'Software/SaaS';
      }
      if (vendorLower.includes('electric') || vendorLower.includes('gas') || vendorLower.includes('water')) {
        return 'Utilities';
      }
      if (vendorLower.includes('verizon') || vendorLower.includes('at&t') || vendorLower.includes('wireless')) {
        return 'Telecommunications';
      }
    }

    return 'General';
  }

  /**
   * Calculate template matching score
   */
  private calculateTemplateScore(
    normalizedText: string,
    extractedData: CanonicalInvoice | undefined,
    template: InvoiceTemplate
  ): number {
    let score = 0;
    let totalChecks = 0;

    // Check vendor patterns
    const vendorScore = this.checkVendorPatterns(normalizedText, extractedData, template);
    score += vendorScore * 0.4; // 40% weight
    totalChecks += 0.4;

    // Check field patterns
    const fieldScore = this.checkFieldPatterns(normalizedText, template);
    score += fieldScore * 0.3; // 30% weight
    totalChecks += 0.3;

    // Check layout indicators
    const layoutScore = this.checkLayoutIndicators(normalizedText, template);
    score += layoutScore * 0.3; // 30% weight
    totalChecks += 0.3;

    return score / totalChecks;
  }

  /**
   * Check vendor name patterns
   */
  private checkVendorPatterns(
    normalizedText: string,
    extractedData: CanonicalInvoice | undefined,
    template: InvoiceTemplate
  ): number {
    const vendorText = extractedData?.vendor_name?.toLowerCase() || '';
    let matches = 0;

    for (const pattern of template.vendor_patterns) {
      const patternLower = pattern.toLowerCase();
      if (normalizedText.includes(patternLower) || vendorText.includes(patternLower)) {
        matches++;
      }
    }

    return template.vendor_patterns.length > 0 ? matches / template.vendor_patterns.length : 0;
  }

  /**
   * Check field pattern matches
   */
  private checkFieldPatterns(normalizedText: string, template: InvoiceTemplate): number {
    let totalPatterns = 0;
    let matches = 0;

    for (const fieldPatterns of Object.values(template.field_patterns)) {
      for (const pattern of fieldPatterns) {
        totalPatterns++;
        if (normalizedText.includes(pattern.toLowerCase())) {
          matches++;
        }
      }
    }

    return totalPatterns > 0 ? matches / totalPatterns : 0;
  }

  /**
   * Check layout indicator matches
   */
  private checkLayoutIndicators(normalizedText: string, template: InvoiceTemplate): number {
    let matches = 0;

    for (const indicator of template.layout_indicators) {
      if (normalizedText.includes(indicator.toLowerCase())) {
        matches++;
      }
    }

    return template.layout_indicators.length > 0 ? matches / template.layout_indicators.length : 0;
  }

  /**
   * Get patterns that matched for a template
   */
  private getMatchedPatterns(normalizedText: string, template: InvoiceTemplate): string[] {
    const matched: string[] = [];

    // Check vendor patterns
    for (const pattern of template.vendor_patterns) {
      if (normalizedText.includes(pattern.toLowerCase())) {
        matched.push(`vendor: ${pattern}`);
      }
    }

    // Check field patterns
    for (const [field, patterns] of Object.entries(template.field_patterns)) {
      for (const pattern of patterns) {
        if (normalizedText.includes(pattern.toLowerCase())) {
          matched.push(`field(${field}): ${pattern}`);
        }
      }
    }

    // Check layout indicators
    for (const indicator of template.layout_indicators) {
      if (normalizedText.includes(indicator.toLowerCase())) {
        matched.push(`layout: ${indicator}`);
      }
    }

    return matched;
  }

  /**
   * Normalize text for pattern matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Add custom template
   */
  addTemplate(template: InvoiceTemplate): void {
    const existingIndex = this.templates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      this.templates[existingIndex] = template;
    } else {
      this.templates.push(template);
    }
  }

  /**
   * Remove template
   */
  removeTemplate(templateId: string): boolean {
    const index = this.templates.findIndex(t => t.id === templateId);
    if (index >= 0) {
      this.templates.splice(index, 1);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const templateRecognitionService = new TemplateRecognitionService();