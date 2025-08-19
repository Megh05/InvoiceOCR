import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WizardState } from "@/types/invoice";
import { ValidationResults } from "@/components/ValidationResults";
import { RotateCcw, FileText, File } from "lucide-react";

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
  const [viewMode, setViewMode] = useState<'pdf' | 'ocr'>('pdf');

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

        {/* Validation Results */}
        {state.parseResult && (
          <div className="mb-6">
            <ValidationResults
              validation={state.parseResult.validation_results}
              improvements={state.parseResult.improvements}
              llmEnhanced={state.parseResult.llm_enhanced}
              confidence={state.parseResult.confidence}
            />
          </div>
        )}

        {/* OCR Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Panel - Document View with Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Document View</h4>
              <Select value={viewMode} onValueChange={(value: 'pdf' | 'ocr') => setViewMode(value)}>
                <SelectTrigger className="w-32" data-testid="select-view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf" data-testid="option-pdf-view">
                    <div className="flex items-center">
                      <File className="w-4 h-4 mr-2" />
                      PDF View
                    </div>
                  </SelectItem>
                  <SelectItem value="ocr" data-testid="option-ocr-text">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      OCR Text
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 h-96 overflow-auto">
              {viewMode === 'pdf' ? (
                // PDF/Image View
                <div>
                  {state.imageFile ? (
                    <div className="h-full flex flex-col">
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-600 font-medium">{state.imageFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(state.imageFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      {state.imageFile.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(state.imageFile)} 
                          alt="Document preview" 
                          className="max-w-full h-auto rounded border"
                          data-testid="img-document-preview"
                        />
                      ) : state.imageFile.type === 'application/pdf' ? (
                        <div className="h-full flex flex-col">
                          <object
                            data={URL.createObjectURL(state.imageFile)}
                            type="application/pdf"
                            className="w-full h-80 rounded border"
                            data-testid="pdf-viewer"
                          >
                            <div className="text-center py-12">
                              <File className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                              <p className="text-sm text-gray-600">PDF file uploaded</p>
                              <p className="text-xs text-gray-500 mt-1">
                                <a 
                                  href={URL.createObjectURL(state.imageFile)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                  data-testid="link-open-pdf"
                                >
                                  Click here to open PDF in new tab
                                </a>
                              </p>
                            </div>
                          </object>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <File className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Document file uploaded</p>
                          <p className="text-xs text-gray-500 mt-1">Preview not available for this file type</p>
                        </div>
                      )}
                    </div>
                  ) : state.imageUrl ? (
                    <div className="h-full flex flex-col">
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-600 font-medium">Image from URL</p>
                        <p className="text-xs text-gray-500 truncate">{state.imageUrl}</p>
                      </div>
                      <img 
                        src={state.imageUrl} 
                        alt="Document from URL" 
                        className="max-w-full h-auto rounded border"
                        data-testid="img-document-from-url"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">No document file available</p>
                      <p className="text-xs text-gray-500 mt-1">Text was entered directly</p>
                    </div>
                  )}
                </div>
              ) : (
                // OCR Text View
                <div className="h-full">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600 font-medium">Raw OCR Output</p>
                    {state.parseResult && (
                      <p className="text-xs text-gray-500">
                        Confidence: {Math.round(state.parseResult.confidence * 100)}%
                      </p>
                    )}
                  </div>
                  <div className="bg-white border rounded p-3 h-56 overflow-auto">
                    <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap" data-testid="text-raw-ocr">
                      {state.parseResult?.raw_ocr_text || state.ocrText || "No OCR text available"}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Editable Text */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Edit Extracted Text</h4>
              <div className="flex items-center space-x-2">
                {state.parseResult && getConfidenceBadge(state.parseResult.confidence)}
              </div>
            </div>
            <Textarea
              rows={17}
              className="font-mono text-sm resize-none"
              value={editedText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Extracted text will appear here for editing..."
              data-testid="textarea-edit-ocr"
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
