import { useState, useRef, useEffect } from "react";
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
  const [localUrl, setLocalUrl] = useState(state.imageUrl || '');
  const [localText, setLocalText] = useState(state.ocrText || '');

  // Sync local state with parent state
  useEffect(() => {
    setLocalUrl(state.imageUrl || '');
  }, [state.imageUrl]);

  useEffect(() => {
    setLocalText(state.ocrText || '');
  }, [state.ocrText]);

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
      return Boolean(localUrl.trim() && localUrl.length > 0);
    }
    if (state.inputType === 'text') {
      return Boolean(localText.trim() && localText.length > 0);
    }
    return false;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/90 backdrop-blur-sm border border-white/40 rounded-3xl p-6 shadow-xl">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
              Upload Invoice or Paste OCR Text
            </h3>
            <p className="text-gray-600 text-sm">Choose your preferred method to input invoice data for processing</p>
          </div>

        {/* Enhanced Upload Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Image Upload */}
          <div
            className={`relative group border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
              state.inputType === 'file'
                ? "border-blue-400 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 shadow-lg"
                : dragActive
                ? "border-blue-400 bg-blue-50/50"
                : "border-gray-200 hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Upload PDF/Image</h4>
            <p className="text-sm text-gray-600 mb-2">Drop files here or click to browse</p>
            <p className="text-xs text-blue-600 font-medium">Supports: JPG, PNG, PDF</p>
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
            className={`relative group border-2 rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
              state.inputType === 'url'
                ? "border-green-400 bg-gradient-to-br from-green-50/80 to-emerald-50/80 shadow-lg"
                : "border-gray-200 hover:border-green-400 hover:bg-gradient-to-br hover:from-green-50/50 hover:to-emerald-50/50"
            }`}
            onClick={() => onInputTypeChange('url')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300">
              <Link className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Image URL</h4>
            <p className="text-xs text-gray-600 mb-4">Paste a direct link to your invoice image</p>
            <Input
              type="url"
              placeholder="https://example.com/invoice.jpg"
              value={localUrl}
              onChange={(e) => {
                setLocalUrl(e.target.value);
                onUrlChange(e.target.value);
              }}
              className="text-sm"
              onClick={(e) => e.stopPropagation()}
              data-testid="input-image-url"
            />
          </div>

          {/* OCR Text */}
          <div
            className={`relative group border-2 rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
              state.inputType === 'text'
                ? "border-purple-400 bg-gradient-to-br from-purple-50/80 to-violet-50/80 shadow-lg"
                : "border-gray-200 hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-50/50 hover:to-violet-50/50"
            }`}
            onClick={() => onInputTypeChange('text')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300">
              <Keyboard className="w-5 h-5 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Paste OCR Text</h4>
            <p className="text-sm text-gray-600 mb-2">Already have extracted text?</p>
            <p className="text-xs text-purple-600 font-medium">Will verify with Mistral OCR</p>
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
              value={localText}
              onChange={(e) => {
                setLocalText(e.target.value);
                onTextChange(e.target.value);
              }}
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
    </div>
  );
}
