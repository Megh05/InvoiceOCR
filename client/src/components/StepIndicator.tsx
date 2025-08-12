import { WizardStep } from "@/types/invoice";

interface StepIndicatorProps {
  currentStep: WizardStep;
  totalSteps: number;
}

const stepLabels = {
  1: "Upload",
  2: "Run OCR",
  3: "Review",
  4: "Edit", 
  5: "Save"
};

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = (i + 1) as WizardStep;
          const isActive = step <= currentStep;
          const isCurrent = step === currentStep;
          
          return (
            <div key={step} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-500 text-white"
                      : "bg-gray-300 text-gray-500"
                  }`}
                >
                  {step}
                </div>
                <span
                  className={`ml-2 text-sm transition-colors ${
                    isActive ? "font-medium text-gray-900" : "text-gray-500"
                  }`}
                >
                  {stepLabels[step]}
                </span>
              </div>
              
              {step < totalSteps && (
                <div className="flex-1 h-px bg-gray-300 mx-4 min-w-[2rem]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
