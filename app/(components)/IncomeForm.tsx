"use client";
import React, { useMemo, useEffect } from "react";
import { Income } from "./types";
import { DollarSign, PiggyBank, Calendar } from "lucide-react";
import '../../styles/globals.css';

interface IncomeFormProps {
  income: Income;
  setIncomeAction: React.Dispatch<React.SetStateAction<Income>>;
  showMonthsField?: boolean;
  onSavingsCalculated?: (savings: { monthly: number; total: number; percent: number }) => void;
}

export default function IncomeForm({
  income,
  setIncomeAction,

  onSavingsCalculated
}: IncomeFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setIncomeAction(prev => ({
      ...prev,
      [name]: name === "amount" || name === "miscPercent" || name === "monthsToShow"
        ? parseFloat(value)
        : value
    }));
  };

  const calculateMonthlySavings = useMemo(() => {
    let monthlyAmount = income.amount;

    switch (income.frequency) {
      case "weekly":
        monthlyAmount = income.amount * 4.345;
        break;
      case "biweekly":
        monthlyAmount = income.amount * 2.1725;
        break;
      default:
        monthlyAmount = income.amount;
    }
    const percentAmount = income.miscPercent;
    const monthlySavings = monthlyAmount * (income.miscPercent / 100);
    const totalProjectedSavings = monthlySavings * (income.monthsToShow || 0);

    return {
      monthly: monthlySavings,
      total: totalProjectedSavings,
      percent: percentAmount
    };
  }, [income.amount, income.frequency, income.miscPercent, income.monthsToShow]);

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
      <div className="p-5 space-y-5">
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
              name="amount"
              value={income.amount}
              onChange={handleChange}
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
            name="frequency"
            value={income.frequency}
            onChange={handleChange}
            className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Last Pay Date */}
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
            Last Pay Date
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="date"
              name="lastPayDate"
              value={income.lastPayDate}
              onChange={handleChange}
              className="pl-10 block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>

        {/* Savings Percent */}
        <div>
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
                onChange={handleChange}
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
            onChange={handleChange}
            className="block w-full rounded border border-neutral-300 bg-neutral-50 text-neutral-900 py-2.5 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
