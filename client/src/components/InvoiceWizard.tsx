import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { WizardState, CanonicalInvoice } from "@/types/invoice";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

import StepIndicator from "./StepIndicator";
import UploadStep from "./UploadStep";
import OCRStep from "./OCRStep";
import ReviewStep from "./ReviewStep";
import EditStep from "./EditStep";
import SaveStep from "./SaveStep";

const TOTAL_STEPS = 5;

export default function InvoiceWizard() {
  const { toast } = useToast();
  
  const [state, setState] = useState<WizardState>({
    step: 1,
    inputType: null,
    imageFile: null,
    imageUrl: "",
    ocrText: "",
    parseResult: null,
    editedInvoice: null,
    savedInvoice: null,
    isProcessing: false,
    error: null,
  });

  const updateState = (updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  // Parse mutation
  const parseMutation = useMutation({
    mutationFn: api.parseInvoice,
    onMutate: () => {
      updateState({ isProcessing: true, error: null });
    },
    onSuccess: (result) => {
      updateState({ 
        parseResult: result, 
        isProcessing: false,
        step: 3 
      });

      if (result.action) {
        toast({
          title: "Review Required",
          description: result.action,
          variant: "default",
        });
      }
    },
    onError: (error: Error) => {
      updateState({ isProcessing: false, error: error.message });
      
      if (error.message.includes('503') || error.message.includes('unavailable')) {
        toast({
          title: "OCR Service Error",
          description: "Mistral OCR is currently unavailable. Please try again later.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Processing Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: api.saveInvoice,
    onSuccess: (invoice) => {
      updateState({ savedInvoice: invoice });
      toast({
        title: "Success!",
        description: `Invoice ${invoice.invoice_number || invoice.id} saved successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Step 1: Upload handlers
  const handleFileSelect = useCallback((file: File) => {
    updateState({ imageFile: file });
  }, []);

  const handleUrlChange = useCallback((url: string) => {
    updateState({ imageUrl: url });
  }, []);

  const handleTextChange = useCallback((text: string) => {
    updateState({ ocrText: text });
  }, []);

  const handleInputTypeChange = useCallback((type: 'file' | 'url' | 'text') => {
    updateState({ inputType: type });
  }, []);

  const handleUploadNext = useCallback(() => {
    updateState({ step: 2 });

    // Prepare parse request
    const parseRequest: ParseRequest = {};
    
    if (state.inputType === 'file' && state.imageFile) {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:image/...;base64, prefix
        parseMutation.mutate({ image_base64: base64Data });
      };
      reader.readAsDataURL(state.imageFile);
    } else if (state.inputType === 'url' && state.imageUrl) {
      parseMutation.mutate({ image_url: state.imageUrl });
    } else if (state.inputType === 'text' && state.ocrText) {
      parseMutation.mutate({ ocr_text: state.ocrText });
    }
  }, [state.inputType, state.imageFile, state.imageUrl, state.ocrText, parseMutation]);

  // Step 3: Review handlers
  const handleTextEdit = useCallback((text: string) => {
    if (state.parseResult) {
      const updatedResult = {
        ...state.parseResult,
        parsed: {
          ...state.parseResult.parsed,
          raw_ocr_text: text
        }
      };
      updateState({ parseResult: updatedResult });
    }
  }, [state.parseResult]);

  const handleRerunOCR = useCallback(() => {
    if (state.parseResult) {
      updateState({ step: 2 });
      const parseRequest: ParseRequest = { ocr_text: state.parseResult.raw_ocr_text };
      parseMutation.mutate(parseRequest);
    }
  }, [state.parseResult, parseMutation]);

  const handleReviewNext = useCallback(() => {
    if (state.parseResult) {
      updateState({ 
        step: 4,
        editedInvoice: state.parseResult.parsed 
      });
    }
  }, [state.parseResult]);

  // Step 4: Edit handlers
  const handleInvoiceChange = useCallback((invoice: CanonicalInvoice) => {
    updateState({ editedInvoice: invoice });
  }, []);

  const handleSaveDraft = useCallback(() => {
    if (state.editedInvoice) {
      saveMutation.mutate(state.editedInvoice);
    }
  }, [state.editedInvoice, saveMutation]);

  const handleEditNext = useCallback(() => {
    updateState({ step: 5 });
  }, []);

  // Step 5: Save handlers
  const handleSave = useCallback(async () => {
    if (state.editedInvoice) {
      return saveMutation.mutateAsync(state.editedInvoice);
    }
  }, [state.editedInvoice, saveMutation]);

  const handleExportJSON = useCallback(async () => {
    if (state.editedInvoice) {
      await api.exportJSON(state.editedInvoice);
    }
  }, [state.editedInvoice]);

  const handleExportCSV = useCallback(async () => {
    if (state.editedInvoice?.line_items) {
      await api.exportCSV(state.editedInvoice.line_items);
    }
  }, [state.editedInvoice]);

  const handleViewInvoice = useCallback(() => {
    // Navigate to invoice detail view - would use router in full implementation
    toast({
      title: "Navigation",
      description: "Would navigate to invoice detail view",
    });
  }, [toast]);

  const handleProcessAnother = useCallback(() => {
    // Reset wizard state
    setState({
      step: 1,
      inputType: null,
      imageFile: null,
      imageUrl: "",
      ocrText: "",
      parseResult: null,
      editedInvoice: null,
      savedInvoice: null,
      isProcessing: false,
      error: null,
    });
  }, []);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (state.step > 1) {
      updateState({ step: (state.step - 1) as WizardStep });
    }
  }, [state.step]);

  const handleStartOver = useCallback(() => {
    handleProcessAnother();
  }, [handleProcessAnother]);

  return (
    <div>
      <StepIndicator currentStep={state.step} totalSteps={TOTAL_STEPS} />
      
      {state.step === 1 && (
        <UploadStep
          state={state}
          onFileSelect={handleFileSelect}
          onUrlChange={handleUrlChange}
          onTextChange={handleTextChange}
          onInputTypeChange={handleInputTypeChange}
          onNext={handleUploadNext}
        />
      )}

      {state.step === 2 && (
        <OCRStep />
      )}

      {state.step === 3 && (
        <ReviewStep
          state={state}
          onTextEdit={handleTextEdit}
          onRerunOCR={handleRerunOCR}
          onNext={handleReviewNext}
          onPrevious={handlePrevious}
        />
      )}

      {state.step === 4 && (
        <EditStep
          state={state}
          onInvoiceChange={handleInvoiceChange}
          onSaveDraft={handleSaveDraft}
          onNext={handleEditNext}
          onPrevious={handlePrevious}
        />
      )}

      {state.step === 5 && (
        <SaveStep
          state={state}
          onSave={handleSave}
          onExportJSON={handleExportJSON}
          onExportCSV={handleExportCSV}
          onViewInvoice={handleViewInvoice}
          onProcessAnother={handleProcessAnother}
          onPrevious={handlePrevious}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  );
}
