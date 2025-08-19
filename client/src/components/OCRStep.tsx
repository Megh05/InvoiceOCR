import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function OCRStep() {
  const [currentStage, setCurrentStage] = useState<'ocr' | 'verification'>('ocr');
  
  // Simulate the progression from OCR to verification after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentStage('verification');
    }, 3000); // Switch to verification stage after 3 seconds
    
    return () => clearTimeout(timer);
  }, []);

  const isOCRComplete = currentStage === 'verification';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Step 2: OCR & AI Verification</h3>
          <p className="text-gray-600">
            {currentStage === 'ocr' ? 'Extracting text from your document...' : 'Verifying data accuracy with AI...'}
          </p>
        </div>

        {/* Processing Animation */}
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 mb-2">
              {currentStage === 'ocr' ? 'Running OCR Extraction' : 'AI Verification in Progress'}
            </p>
            <p className="text-gray-600 mb-4">
              {currentStage === 'ocr' 
                ? 'Analyzing document structure and extracting text...' 
                : 'Checking accuracy and correcting any errors found...'}
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                currentStage === 'ocr' ? 'bg-green-400' : 'bg-blue-400'
              }`}></div>
              <span>
                {currentStage === 'ocr' ? 'Connected to Mistral OCR Service' : 'LLM Intelligence Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Sequential Progress Steps */}
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
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              isOCRComplete ? 'bg-green-500' : 'bg-blue-500 animate-pulse'
            }`}>
              {isOCRComplete ? (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </div>
            <span className={`text-sm ${isOCRComplete ? 'text-gray-700' : 'text-gray-600 font-medium'}`}>
              {isOCRComplete ? 'OCR text extraction completed' : 'Running OCR text extraction...'}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              isOCRComplete ? 'bg-green-500' : 'border-2 border-gray-300'
            }`}>
              {isOCRComplete && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${isOCRComplete ? 'text-gray-700' : 'text-gray-500'}`}>
              Key-value pairs extracted
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              currentStage === 'verification' ? 'bg-blue-500 animate-pulse' : 'border-2 border-gray-300'
            }`}>
              {currentStage === 'verification' && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </div>
            <span className={`text-sm ${
              currentStage === 'verification' ? 'text-gray-700 font-medium' : 'text-gray-500'
            }`}>
              {currentStage === 'verification' ? 'Verifying with AI intelligence...' : 'Awaiting AI verification'}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
            <span className="text-sm text-gray-500">Ready for review</span>
          </div>
        </div>

        {/* Stage-Specific Status Card */}
        {currentStage === 'verification' && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900">AI Verification Active</h4>
                <p className="text-sm text-blue-700">
                  Checking extracted data against OCR text, correcting errors and filling missing information...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
