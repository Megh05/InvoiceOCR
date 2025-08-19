import { Loader2 } from "lucide-react";

export default function OCRStep() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Step 2: OCR & AI Verification</h3>
          <p className="text-gray-600">Extracting text and verifying accuracy with AI...</p>
        </div>

        {/* Processing Animation */}
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 mb-2">Processing & Verifying with AI</p>
            <p className="text-gray-600 mb-4">Extracting data and verifying accuracy for maximum precision...</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Connected to Mistral OCR Service</span>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3 max-w-md mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">Document uploaded successfully</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">OCR text extraction completed</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm text-gray-700">Key-value pairs extracted</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full animate-pulse flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            <span className="text-sm text-gray-700">Verifying with LLM intelligence...</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
            <span className="text-sm text-gray-500">Ready for review</span>
          </div>
        </div>

        {/* LLM Verification Status */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">LLM Intelligence Verification</h4>
              <p className="text-sm text-blue-700">
                Checking extracted data for accuracy and completeness. Correcting any missing or incorrect information...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
