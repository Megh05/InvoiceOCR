import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WizardState, CanonicalInvoice, LineItem, FieldConfidence } from "@/types/invoice";
import { Plus, Trash2, Copy, Calculator, File, Building, User } from "lucide-react";

interface EditStepProps {
  state: WizardState;
  onInvoiceChange: (invoice: CanonicalInvoice) => void;
  onSaveDraft: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function EditStep({
  state,
  onInvoiceChange,
  onSaveDraft,
  onNext,
  onPrevious
}: EditStepProps) {
  const [invoice, setInvoice] = useState<CanonicalInvoice>(
    state.editedInvoice || state.parseResult?.parsed || {} as CanonicalInvoice
  );

  useEffect(() => {
    onInvoiceChange(invoice);
  }, [invoice, onInvoiceChange]);

  const getFieldConfidence = (fieldName: string): FieldConfidence | undefined => {
    return state.parseResult?.field_confidences?.find(fc => fc.field === fieldName);
  };

  const getConfidenceBadge = (fieldName: string) => {
    const fieldConf = getFieldConfidence(fieldName);
    if (!fieldConf) return null;

    if (fieldConf.confidence >= 0.85) {
      return <Badge className="confidence-high text-xs ml-2">High</Badge>;
    } else if (fieldConf.confidence >= 0.6) {
      return <Badge className="confidence-medium text-xs ml-2">Medium</Badge>;
    } else {
      return <Badge className="confidence-low text-xs ml-2">Low</Badge>;
    }
  };

  const updateInvoice = (updates: Partial<CanonicalInvoice>) => {
    setInvoice(prev => ({ ...prev, ...updates }));
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      line_number: (invoice.line_items?.length || 0) + 1,
      sku: null,
      description: "",
      qty: 1,
      unit_price: 0,
      amount: 0,
      tax: 0,
    };
    
    updateInvoice({
      line_items: [...(invoice.line_items || []), newItem]
    });
  };

  const updateLineItem = (index: number, updates: Partial<LineItem>) => {
    const updatedItems = [...(invoice.line_items || [])];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    
    // Recalculate amount
    if (updates.qty !== undefined || updates.unit_price !== undefined) {
      updatedItems[index].amount = updatedItems[index].qty * updatedItems[index].unit_price;
    }
    
    updateInvoice({ line_items: updatedItems });
    recalculateTotals(updatedItems);
  };

  const removeLineItem = (index: number) => {
    const updatedItems = [...(invoice.line_items || [])];
    updatedItems.splice(index, 1);
    
    // Renumber line items
    updatedItems.forEach((item, i) => {
      item.line_number = i + 1;
    });
    
    updateInvoice({ line_items: updatedItems });
    recalculateTotals(updatedItems);
  };

  const recalculateTotals = (lineItems: LineItem[]) => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const total = subtotal + invoice.tax + invoice.shipping;
    
    updateInvoice({ subtotal, total });
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(invoice, null, 2));
  };

  const getOverallConfidence = () => {
    if (!state.parseResult?.field_confidences) return 0;
    
    const total = state.parseResult.field_confidences.reduce((sum, fc) => sum + fc.confidence, 0);
    return total / state.parseResult.field_confidences.length;
  };

  const getConfidenceStats = () => {
    if (!state.parseResult?.field_confidences) return { high: 0, medium: 0, low: 0 };
    
    const stats = { high: 0, medium: 0, low: 0 };
    state.parseResult.field_confidences.forEach(fc => {
      if (fc.confidence >= 0.85) stats.high++;
      else if (fc.confidence >= 0.6) stats.medium++;
      else stats.low++;
    });
    
    return stats;
  };

  const overallConf = getOverallConfidence();
  const confStats = getConfidenceStats();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Step 4: Review & Edit Extracted Fields
          </h3>
          <p className="text-gray-600">Verify the parsed invoice data and make corrections if needed</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="xl:col-span-2 space-y-6">
            {/* Invoice Header */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <File className="w-5 h-5 mr-2" />
                Invoice Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number
                    {getConfidenceBadge('invoice_number')}
                  </label>
                  <Input
                    value={invoice.invoice_number || ""}
                    onChange={(e) => updateInvoice({ invoice_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date
                    {getConfidenceBadge('invoice_date')}
                  </label>
                  <Input
                    type="date"
                    value={invoice.invoice_date || ""}
                    onChange={(e) => updateInvoice({ invoice_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                    {getConfidenceBadge('currency')}
                  </label>
                  <Select value={invoice.currency || "USD"} onValueChange={(value) => updateInvoice({ currency: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <Input
                    type="date"
                    value={invoice.invoice_date || ""}
                    onChange={(e) => updateInvoice({ invoice_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Vendor Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Name
                    {getConfidenceBadge('vendor_name')}
                  </label>
                  <Input
                    value={invoice.vendor_name || ""}
                    onChange={(e) => updateInvoice({ vendor_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Address
                    {getConfidenceBadge('vendor_address')}
                  </label>
                  <Textarea
                    rows={3}
                    value={invoice.vendor_address || ""}
                    onChange={(e) => updateInvoice({ vendor_address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bill To
                    {getConfidenceBadge('bill_to')}
                  </label>
                  <Textarea
                    rows={3}
                    value={invoice.bill_to || ""}
                    onChange={(e) => updateInvoice({ bill_to: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ship To
                    {getConfidenceBadge('ship_to')}
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Same as Bill To"
                    value={invoice.ship_to || ""}
                    onChange={(e) => updateInvoice({ ship_to: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Line Items
                </h4>
                <Button size="sm" onClick={addLineItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium text-gray-700">Description</th>
                      <th className="text-center py-2 font-medium text-gray-700 w-20">Qty</th>
                      <th className="text-right py-2 font-medium text-gray-700 w-24">Price</th>
                      <th className="text-right py-2 font-medium text-gray-700 w-24">Amount</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.line_items || []).map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3">
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(index, { description: e.target.value })}
                            className="border-0 focus:ring-0 p-0 bg-transparent"
                          />
                        </td>
                        <td className="py-3 text-center">
                          <Input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateLineItem(index, { qty: Number(e.target.value) })}
                            className="w-16 text-center"
                          />
                        </td>
                        <td className="py-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(index, { unit_price: Number(e.target.value) })}
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="py-3 text-right font-medium">
                          ${item.amount.toFixed(2)}
                        </td>
                        <td className="py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Calculator className="w-5 h-5 mr-2" />
                Totals
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subtotal
                    {getConfidenceBadge('subtotal')}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoice.subtotal}
                    onChange={(e) => updateInvoice({ subtotal: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax
                    {getConfidenceBadge('tax')}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoice.tax}
                    onChange={(e) => updateInvoice({ tax: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total
                    {getConfidenceBadge('total')}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoice.total}
                    onChange={(e) => updateInvoice({ total: Number(e.target.value) })}
                    className="font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* JSON Preview */}
            <div className="border border-gray-200 rounded-lg p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">JSON Preview</h4>
                <Button variant="ghost" size="sm" onClick={copyJSON}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-xs font-mono max-h-96 overflow-y-auto">
                <pre>{JSON.stringify(invoice, null, 2)}</pre>
              </div>
            </div>

            {/* Confidence Summary */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Confidence Summary</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Overall Confidence</span>
                  <Badge className={
                    overallConf >= 0.85 ? "confidence-high" :
                    overallConf >= 0.6 ? "confidence-medium" : "confidence-low"
                  }>
                    {Math.round(overallConf * 100)}% {overallConf >= 0.85 ? 'High' : overallConf >= 0.6 ? 'Medium' : 'Low'}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      overallConf >= 0.85 ? 'bg-green-500' :
                      overallConf >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${overallConf * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>High confidence fields: {confStats.high}</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Medium confidence fields: {confStats.medium}</span>
                    <span className="text-amber-600">⚠</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Low confidence fields: {confStats.low}</span>
                    <span className="text-red-600">✗</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={onPrevious}>
            Previous
          </Button>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onSaveDraft}>
              Save Draft
            </Button>
            <Button onClick={onNext}>
              Continue to Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
