import { useState, useRef } from "react";
import { Upload, Link, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WizardState } from "@/types/invoice";

interface UploadStepProps {
  state: WizardState;
  onFileSelect: (file: File) => void;
  onUrlChange: (url: string) => void;
  onTextChange: (text: string) => void;
  onInputTypeChange: (type: 'file' | 'url' | 'text') => void;
  onNext: () => void;
}

export default function UploadStep({
  state,
  onFileSelect,
  onUrlChange,
  onTextChange,
  onInputTypeChange,
  onNext
}: UploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      onFileSelect(files[0]);
      onInputTypeChange('file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      onFileSelect(files[0]);
      onInputTypeChange('file');
    }
  };

  const canProceed = () => {
    if (state.inputType === 'file') {
      return Boolean(state.imageFile);
    }
    if (state.inputType === 'url') {
      return Boolean(state.imageUrl?.trim() && state.imageUrl.length > 0);
    }
    if (state.inputType === 'text') {
      return Boolean(state.ocrText?.trim() && state.ocrText.length > 0);
    }
    return false;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Step 1: Upload Invoice or Paste OCR Text
          </h3>
          <p className="text-gray-600">Choose your preferred method to input invoice data</p>
        </div>

        {/* Upload Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Image Upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              state.inputType === 'file'
                ? "border-blue-400 bg-blue-50"
                : dragActive
                ? "border-blue-400"
                : "border-gray-300 hover:border-blue-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-blue-500" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Upload PDF/Image</h4>
            <p className="text-sm text-gray-600 mb-4">Drop files here or click to browse</p>
            <p className="text-xs text-gray-500">Supports: JPG, PNG, PDF</p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleFileChange}
            />
          </div>

          {/* Image URL */}
          <div
            className={`border-2 rounded-lg p-6 text-center transition-colors cursor-pointer ${
              state.inputType === 'url'
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 hover:border-blue-400"
            }`}
            onClick={() => onInputTypeChange('url')}
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Link className="w-6 h-6 text-green-500" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Image URL</h4>
            <p className="text-sm text-gray-600 mb-4">Paste a link to your image</p>
            <Input
              type="url"
              placeholder="https://example.com/invoice.jpg"
              value={state.imageUrl || ''}
              onChange={(e) => onUrlChange(e.target.value)}
              className="text-sm"
              onClick={(e) => e.stopPropagation()}
              data-testid="input-image-url"
            />
          </div>

          {/* OCR Text */}
          <div
            className={`border-2 rounded-lg p-6 text-center transition-colors cursor-pointer ${
              state.inputType === 'text'
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 hover:border-blue-400"
            }`}
            onClick={() => onInputTypeChange('text')}
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Keyboard className="w-6 h-6 text-purple-500" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Paste OCR Text</h4>
            <p className="text-sm text-gray-600 mb-4">Already have extracted text?</p>
            <p className="text-xs text-gray-500">Will verify with Mistral OCR</p>
          </div>
        </div>

        {/* File Preview Area */}
        {state.inputType === 'file' && state.imageFile && (
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">File Preview</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onInputTypeChange('file');
                  onFileSelect(null as any);
                }}
              >
                Remove
              </Button>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">{state.imageFile.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(state.imageFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          </div>
        )}

        {/* OCR Text Input Area */}
        {state.inputType === 'text' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste your OCR text
            </label>
            <Textarea
              rows={8}
              className="font-mono text-sm"
              placeholder="Paste the extracted text from your invoice here..."
              value={state.ocrText}
              onChange={(e) => onTextChange(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">
              Note: This text will be verified against Mistral OCR for accuracy
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Button variant="ghost" disabled>
            Previous
          </Button>
          <Button onClick={onNext} disabled={!canProceed() || state.isProcessing}>
            Next: Run OCR
          </Button>
        </div>
      </div>
    </div>
  );
}
