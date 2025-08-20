import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { WizardState, CanonicalInvoice } from "@/types/invoice";
import InvoicePreview from "./InvoicePreview";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

interface EditStepProps {
  state: WizardState;
  onInvoiceChange: (invoice: CanonicalInvoice) => void;
  onSaveDraft: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function EditStep({
  state,
  onInvoiceChange,
  onSaveDraft,
  onNext,
  onPrevious
}: EditStepProps) {
  const [invoice, setInvoice] = useState<CanonicalInvoice>(
    state.editedInvoice || state.parseResult?.parsed || {} as CanonicalInvoice
  );

  useEffect(() => {
    onInvoiceChange(invoice);
  }, [invoice, onInvoiceChange]);

  const handleInvoiceChange = (updatedInvoice: CanonicalInvoice) => {
    setInvoice(updatedInvoice);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Step 4: Review & Edit Extracted Fields
          </h3>
          <p className="text-gray-600">Verify and edit the extracted invoice data with side-by-side comparison</p>
        </div>

        <InvoicePreview
          invoice={invoice}
          fieldConfidences={state.parseResult?.field_confidences}
          onInvoiceChange={handleInvoiceChange}
          rawOcrText={state.parseResult?.raw_ocr_text || state.ocrText}
          editable={true}
          templateMatch={state.parseResult?.template_match}
        />

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onSaveDraft}>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={onNext}>
              Continue to Save
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}