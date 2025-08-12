import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidationResult, ValidationError, ValidationWarning } from "@/types/invoice";
import { AlertTriangle, CheckCircle, Info, Sparkles } from "lucide-react";

interface ValidationResultsProps {
  validation?: ValidationResult;
  improvements?: string[];
  llmEnhanced?: boolean;
  confidence: number;
}

export function ValidationResults({ validation, improvements, llmEnhanced, confidence }: ValidationResultsProps) {
  if (!validation && !improvements?.length && !llmEnhanced) {
    return null;
  }

  const getSeverityIcon = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'major':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'minor':
        return <Info className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSeverityColor = (severity: ValidationError['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'major':
        return 'default';
      case 'minor':
        return 'secondary';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (confidence >= 0.8) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  return (
    <div className="space-y-4">
      {/* Confidence and Enhancement Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Extraction Quality</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={`${getConfidenceColor(confidence)} border-0`}>
                {Math.round(confidence * 100)}% Confidence
              </Badge>
              {llmEnhanced && (
                <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:bg-purple-950">
                  <Sparkles className="h-3 w-3 mr-1" />
                  LLM Enhanced
                </Badge>
              )}
            </div>
          </div>
          {llmEnhanced && (
            <CardDescription>
              This extraction was enhanced using advanced AI to improve accuracy and completeness.
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Validation Results */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              Validation Results
            </CardTitle>
            <CardDescription>
              {validation.isValid 
                ? "Data passed validation with minor warnings"
                : "Issues detected that need attention"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Errors */}
            {validation.errors.map((error, index) => (
              <Alert key={`error-${index}`} variant={error.severity === 'critical' ? 'destructive' : 'default'}>
                <div className="flex items-start gap-2">
                  {getSeverityIcon(error.severity)}
                  <div className="flex-1">
                    <AlertTitle className="text-sm font-medium">
                      {error.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      <Badge variant={getSeverityColor(error.severity)} className="ml-2 text-xs">
                        {error.severity}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="text-sm mt-1">
                      {error.error}
                      {error.suggested_fix && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Suggestion: {error.suggested_fix}
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}

            {/* Warnings */}
            {validation.warnings.map((warning, index) => (
              <Alert key={`warning-${index}`} variant="default" className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                <Info className="h-4 w-4 text-yellow-600" />
                <div className="flex-1">
                  <AlertTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    {warning.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </AlertTitle>
                  <AlertDescription className="text-sm text-yellow-700 dark:text-yellow-400">
                    {warning.warning}
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* LLM Improvements */}
      {improvements && improvements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Improvements Made
            </CardTitle>
            <CardDescription>
              The following enhancements were applied to improve data accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {validation?.isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-300">Validation Passed</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-400">
            All data validation checks passed. The extracted information appears to be accurate and complete.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}