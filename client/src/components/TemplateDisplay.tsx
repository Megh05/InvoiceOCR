import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateMatch } from "@/types/invoice";
import { CheckCircle, AlertCircle, Tag, FileText } from "lucide-react";

interface TemplateDisplayProps {
  templateMatch?: TemplateMatch;
  category?: string;
}

export default function TemplateDisplay({ templateMatch, category }: TemplateDisplayProps) {
  if (!templateMatch && !category) {
    return null;
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800 border-green-200";
    if (confidence >= 0.6) return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Invoice Recognition
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Category */}
          {category && (
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Category:</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {category}
              </Badge>
            </div>
          )}

          {/* Template Match */}
          {templateMatch && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Detected Template:</span>
                  <Badge variant="outline" className="font-medium">
                    {templateMatch.template_name}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {getConfidenceIcon(templateMatch.confidence)}
                  <Badge 
                    variant="outline" 
                    className={`font-medium ${getConfidenceColor(templateMatch.confidence)}`}
                  >
                    {Math.round(templateMatch.confidence * 100)}% confident
                  </Badge>
                </div>
              </div>

              {/* Matched Patterns */}
              {templateMatch.matched_patterns && templateMatch.matched_patterns.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-gray-500 mb-2 block">
                    Matched Patterns:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {templateMatch.matched_patterns.slice(0, 5).map((pattern, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="text-xs bg-gray-100 text-gray-600"
                      >
                        {pattern}
                      </Badge>
                    ))}
                    {templateMatch.matched_patterns.length > 5 && (
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                        +{templateMatch.matched_patterns.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Template Benefits */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Template detected - enhanced field extraction accuracy and auto-categorization applied
                </p>
              </div>
            </div>
          )}

          {/* No Template Detected */}
          {!templateMatch && category && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                No specific template detected - using generic parsing with basic categorization
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}