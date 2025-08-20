type WizardStep = 1 | 2 | 3 | 4 | 5;

interface StepIndicatorProps {
  currentStep: WizardStep;
  totalSteps: number;
}

const stepLabels: Record<WizardStep, string> = {
  1: "Upload",
  2: "Run OCR",
  3: "Review",
  4: "Edit", 
  5: "Save"
};

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="relative max-w-5xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-3xl blur-2xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-white/40 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            {Array.from({ length: totalSteps }, (_, i) => {
              const step = (i + 1) as WizardStep;
              const isActive = step <= currentStep;
              const isCurrent = step === currentStep;
              
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-300 shadow-lg ${
                        isCurrent
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white scale-110 shadow-blue-500/50"
                          : isActive
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {step}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium transition-colors ${
                        isCurrent 
                          ? "text-blue-700 font-bold" 
                          : isActive 
                          ? "text-green-700" 
                          : "text-gray-500"
                      }`}
                    >
                      {stepLabels[step]}
                    </span>
                  </div>
                  
                  {step < totalSteps && (
                    <div className="flex-1 mx-4">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isActive && step < currentStep
                            ? "bg-gradient-to-r from-green-400 to-green-600"
                            : "bg-gray-200"
                        }`} 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
