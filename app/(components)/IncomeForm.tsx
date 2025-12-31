"use client";
import React, { useMemo, useEffect, useState } from "react";
import { Income, IncomeSource } from "./types";
import { DollarSign, PiggyBank, Calendar, Plus, Trash2, Briefcase, Save, Loader2 } from "lucide-react";
import '../../styles/globals.css';

interface IncomeFormProps {
  income: Income;
  setIncomeAction: React.Dispatch<React.SetStateAction<Income>>;
  showMonthsField?: boolean;
  onSavingsCalculated?: (savings: { monthly: number; total: number; percent: number }) => void;
  onSaveIncome?: () => Promise<void>;
  isSaving?: boolean;
}

// Helper function to generate unique IDs
const generateId = () => `income-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to calculate monthly income for a single source
const calculateMonthlyForSource = (source: IncomeSource): number => {
  switch (source.frequency) {
    case "weekly":
      return source.amount * 4.345;
    case "biweekly":
      return source.amount * 2.1725;
    case "twicemonthly":
      return source.amount * 2;
    default:
      return source.amount;
  }
};

export default function IncomeForm({
  income,
  setIncomeAction,
  onSavingsCalculated,
  onSaveIncome,
  isSaving = false
}: IncomeFormProps) {

  const handleSourceChange = (id: string, field: keyof IncomeSource, value: string | number) => {
    setIncomeAction(prev => ({
      ...prev,
      sources: prev.sources.map(source =>
        source.id === id
          ? { ...source, [field]: value }
          : source
      )
    }));
  };

  const handleGlobalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIncomeAction(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const addIncomeSource = () => {
    const newSource: IncomeSource = {
      id: generateId(),
      name: income.sources.length === 0 ? "Primary Income" : `Income Source ${income.sources.length + 1}`,
      amount: 0,
      frequency: "biweekly",
      lastPayDate: "",
      firstPayDay: 1,
      secondPayDay: 15
    };
    setIncomeAction(prev => ({
      ...prev,
      sources: [...prev.sources, newSource]
    }));
  };

  const removeIncomeSource = (id: string) => {
    setIncomeAction(prev => ({
      ...prev,
      sources: prev.sources.filter(source => source.id !== id)
    }));
  };

  const calculateMonthlySavings = useMemo(() => {
    // Calculate total monthly income from all sources
    const totalMonthlyIncome = income.sources.reduce((total, source) => {
      return total + calculateMonthlyForSource(source);
    }, 0);

    const percentAmount = income.miscPercent;
    const monthlySavings = totalMonthlyIncome * (income.miscPercent / 100);
    const totalProjectedSavings = monthlySavings * (income.monthsToShow || 0);

    return {
      monthly: monthlySavings,
      total: totalProjectedSavings,
      percent: percentAmount
    };
  }, [income.sources, income.miscPercent, income.monthsToShow]);

  // Notify parent component when savings calculations change
  useEffect(() => {
    onSavingsCalculated?.(calculateMonthlySavings);
  }, [calculateMonthlySavings, onSavingsCalculated]);

  return (
    <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="bg-neutral-900 px-5 py-4 border-b-2 border-primary-500">
        <h2 className="text-base font-bold text-white uppercase tracking-wide">Income Details</h2>
      </div>

      {/* Form Content */}
      <div className="p-4 sm:p-5 space-y-5 overflow-x-hidden">
        {/* Income Sources */}
        {income.sources.map((source, index) => (
          <div key={source.id} className="border border-neutral-200 rounded-lg overflow-hidden">
            {/* Source Header */}
            <div className="bg-neutral-100 px-4 py-3 flex items-center justify-between border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={source.name}
                  onChange={(e) => handleSourceChange(source.id, 'name', e.target.value)}
                  className="bg-transparent font-semibold text-neutral-700 text-sm border-none focus:outline-none focus:ring-0 p-0"
                  placeholder="Income Name"
                />
              </div>
              {income.sources.length > 1 && (
                <button
                  onClick={() => removeIncomeSource(source.id)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1"
                  title="Remove income source"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Source Fields */}
            <div className="p-3 sm:p-4 space-y-4 overflow-x-hidden">
              {/* Income Amount */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  Income Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="number"
                    value={source.amount || ''}
                    onChange={(e) => handleSourceChange(source.id, 'amount', parseFloat(e.target.value) || 0)}
                    className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  Pay Frequency
                </label>
                <select
                  value={source.frequency}
                  onChange={(e) => handleSourceChange(source.id, 'frequency', e.target.value)}
                  className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="twicemonthly">Twice Monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Pay Day Selectors for Twice Monthly */}
              {source.frequency === "twicemonthly" && (
                <div className="p-4 bg-primary-50 rounded-lg border border-primary-200 space-y-3">
                  <p className="text-sm text-primary-700 font-semibold">Select your pay days each month:</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">First Pay Day</label>
                      <select
                        value={source.firstPayDay || 1}
                        onChange={(e) => handleSourceChange(source.id, 'firstPayDay', parseInt(e.target.value))}
                        className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Second Pay Day</label>
                      <select
                        value={source.secondPayDay || 15}
                        onChange={(e) => handleSourceChange(source.id, 'secondPayDay', parseInt(e.target.value))}
                        className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Pay Date */}
              <div className="overflow-hidden">
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  <Calendar className="h-3 w-3 text-neutral-400 inline-block mr-1" />
                  Last Pay Date
                </label>
                <input
                  type="date"
                  value={source.lastPayDate}
                  onChange={(e) => handleSourceChange(source.id, 'lastPayDate', e.target.value)}
                  className="block w-full max-w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors box-border"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add Income Source Button */}
        <button
          onClick={addIncomeSource}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="font-medium text-sm">Add Income Source</span>
        </button>

        {/* Divider */}
        <div className="border-t border-neutral-200 pt-5">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-4">Global Settings</p>

          {/* Savings Percent */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              Savings %
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <PiggyBank className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  type="number"
                  name="miscPercent"
                  min={0}
                  max={100}
                  value={income.miscPercent}
                  onChange={handleGlobalChange}
                  className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                />
              </div>
              <span className="text-neutral-500 font-semibold text-sm">%</span>
            </div>
          </div>

          {/* Months to Project */}
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              Months to Project
            </label>
            <input
              type="number"
              name="monthsToShow"
              min={1}
              value={income.monthsToShow}
              onChange={handleGlobalChange}
              className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>

          {/* Save Income Button */}
          {onSaveIncome && (
            <button
              onClick={onSaveIncome}
              disabled={isSaving || income.sources.length === 0}
              className="w-full bg-primary-500 text-neutral-900 py-2.5 px-4 rounded font-semibold hover:bg-primary-400 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Income
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
