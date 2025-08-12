import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InvoiceWizard from "@/components/InvoiceWizard";
import { api } from "@/services/api";

// Mock the API
vi.mock("@/services/api", () => ({
  api: {
    parseInvoice: vi.fn(),
    saveInvoice: vi.fn(),
    exportJSON: vi.fn(),
    exportCSV: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("InvoiceWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render upload step initially", () => {
    render(<InvoiceWizard />, { wrapper: createWrapper() });
    
    expect(screen.getByText("Step 1: Upload Invoice or Paste OCR Text")).toBeInTheDocument();
    expect(screen.getByText("Upload Image")).toBeInTheDocument();
    expect(screen.getByText("Image URL")).toBeInTheDocument();
    expect(screen.getByText("Paste OCR Text")).toBeInTheDocument();
  });

  it("should show step indicator with correct current step", () => {
    render(<InvoiceWizard />, { wrapper: createWrapper() });
    
    // Check that step 1 is active
    const step1 = screen.getByText("1");
    expect(step1.closest("div")).toHaveClass("bg-blue-500");
    
    // Check that other steps are inactive
    const step2 = screen.getByText("2");
    expect(step2.closest("div")).toHaveClass("bg-gray-300");
  });

  it("should handle file upload selection", () => {
    render(<InvoiceWizard />, { wrapper: createWrapper() });
    
    const fileInput = screen.getByRole("textbox", { hidden: true }) as HTMLInputElement;
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Should show file preview
    expect(screen.getByText("File Preview")).toBeInTheDocument();
    expect(screen.getByText("test.jpg")).toBeInTheDocument();
  });

  it("should handle URL input", () => {
    render(<InvoiceWizard />, { wrapper: createWrapper() });
    
    const urlInput = screen.getByPlaceholderText("https://example.com/invoice.jpg");
    fireEvent.change(urlInput, { target: { value: "https://example.com/test.jpg" } });
    
    expect(urlInput).toHaveValue("https://example.com/test.jpg");
  });

  it("should handle OCR text input", () => {
    render(<InvoiceWizard />, { wrapper: createWrapper() });
    
    // Click on OCR text option
    const ocrTextOption = screen.getByText("Paste OCR Text").closest("div");
    fireEvent.click(ocrTextOption!);
    
    // Should show textarea
    const textarea = screen.getByPlaceholderText("Paste the extracted text from your invoice here...");
    fireEvent.change(textarea, { target: { value: "Test OCR text" } });
    
    expect(textarea).toHaveValue("Test OCR text");
  });

  it("should call parse API when proceeding with image URL", async () => {
    const mockParseResult = {
      parsed: {
        invoice_number: "INV-001",
        invoice_date: "2024-03-15",
        vendor_name: "Test Company",
        subtotal: 100,
        tax: 10,
        total: 110,
        line_items: [],
        raw_ocr_text: "Test OCR",
        mistral_ocr_text: "Test OCR",
        ocr_similarity_score: 0.95,
      },
      confidence: 0.9,
      raw_ocr_text: "Test OCR",
      mistral_ocr_text: "Test OCR",
      ocr_similarity_score: 0.95,
      fallback_used: false,
      field_confidences: [],
    };

    (api.parseInvoice as any).mockResolvedValue(mockParseResult);

    render(<InvoiceWizard />, { wrapper: createWrapper() });
    
    // Click URL option and enter URL
    const urlOption = screen.getByText("Image URL").closest("div");
    fireEvent.click(urlOption!);
    
    const urlInput = screen.getByPlaceholderText("https://example.com/invoice.jpg");
    fireEvent.change(urlInput, { target: { value: "https://example.com/test.jpg" } });
    
    // Click next button
    const nextButton = screen.getByText("Next: Run OCR");
    fireEvent.click(nextButton);
    
    // Should show OCR step
    expect(screen.getByText("Step 2: Running Mistral OCR")).toBeInTheDocument();
    
    // Wait for API call and transition to review step
    await waitFor(() => {
      expect(api.parseInvoice).toHaveBeenCalledWith({
        image_url: "https://example.com/test.jpg",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Step 3: Review OCR Text")).toBeInTheDocument();
    });
  });

  it("should handle API errors gracefully", async () => {
    (api.parseInvoice as any).mockRejectedValue(new Error("OCR service unavailable"));

    render(<InvoiceWizard />, { wrapper: createWrapper() });
    
    // Set up URL input
    const urlOption = screen.getByText("Image URL").closest("div");
    fireEvent.click(urlOption!);
    
    const urlInput = screen.getByPlaceholderText("https://example.com/invoice.jpg");
    fireEvent.change(urlInput, { target: { value: "https://example.com/test.jpg" } });
    
    const nextButton = screen.getByText("Next: Run OCR");
    fireEvent.click(nextButton);
    
    // Wait for error handling
    await waitFor(() => {
      expect(api.parseInvoice).toHaveBeenCalled();
    });
    
    // Should stay on upload step and show error state
    expect(screen.getByText("Step 1: Upload Invoice or Paste OCR Text")).toBeInTheDocument();
  });

  it("should disable next button when no input is provided", () => {
    render(<InvoiceWizard />, { wrapper: createWrapper() });
    
    const nextButton = screen.getByText("Next: Run OCR");
    expect(nextButton).toBeDisabled();
  });

  it("should enable next button when valid input is provided", () => {
    render(<InvoiceWizard />, { wrapper: createWrapper() });
    
    // Click URL option and enter URL
    const urlOption = screen.getByText("Image URL").closest("div");
    fireEvent.click(urlOption!);
    
    const urlInput = screen.getByPlaceholderText("https://example.com/invoice.jpg");
    fireEvent.change(urlInput, { target: { value: "https://example.com/test.jpg" } });
    
    const nextButton = screen.getByText("Next: Run OCR");
    expect(nextButton).not.toBeDisabled();
  });
});
