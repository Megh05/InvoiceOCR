import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { WizardState } from "@/types/invoice";
import { RotateCcw } from "lucide-react";

interface ReviewStepProps {
  state: WizardState;
  onTextEdit: (text: string) => void;
  onRerunOCR: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function ReviewStep({
  state,
  onTextEdit,
  onRerunOCR,
  onNext,
  onPrevious
}: ReviewStepProps) {
  const [editedText, setEditedText] = useState(state.parseResult?.raw_ocr_text || "");

  const handleTextChange = (text: string) => {
    setEditedText(text);
    onTextEdit(text);
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.9) {
      return <Badge className="confidence-high">95% Confidence</Badge>;
    } else if (score >= 0.7) {
      return <Badge className="confidence-medium">80% Confidence</Badge>;
    } else {
      return <Badge className="confidence-low">65% Confidence</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Step 3: Review OCR Text</h3>
          <p className="text-gray-600">Verify and edit the extracted text if needed</p>
        </div>

        {/* OCR Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Original Image Preview */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Original Document</h4>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {state.imageFile ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">{state.imageFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(state.imageFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : state.imageUrl ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">Image from URL</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{state.imageUrl}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">OCR Text Input</p>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Text */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Extracted Text</h4>
              <div className="flex items-center space-x-2">
                {state.parseResult && getConfidenceBadge(state.parseResult.confidence)}
              </div>
            </div>
            <Textarea
              rows={12}
              className="font-mono text-sm"
              value={editedText}
              onChange={(e) => handleTextChange(e.target.value)}
            />

            {/* OCR Similarity Score */}
            {state.parseResult && state.inputType === 'text' && state.parseResult.ocr_similarity_score < 1 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-blue-800">OCR Verification</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Similarity with your provided text:{" "}
                  <span className="font-semibold">
                    {Math.round(state.parseResult.ocr_similarity_score * 100)}%
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between space-x-4">
          <Button variant="outline" onClick={onPrevious}>
            Previous
          </Button>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={onRerunOCR} disabled={state.isProcessing}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Re-run OCR
            </Button>
            <Button onClick={onNext} disabled={state.isProcessing}>
              Accept & Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
