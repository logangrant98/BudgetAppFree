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
      [name]: name === "amount" || name === "miscPercent" || name === "monthsToShow" || name === "firstPayDay" || name === "secondPayDay"
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
      case "twicemonthly":
        monthlyAmount = income.amount * 2; // Paid twice per month
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
    <div className="bg-white p-6 rounded-xl border border-gray-00 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Income Details</h2>
      
      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Income Amount</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              name="amount"
              value={income.amount}
              onChange={handleChange}
              className="pl-10 block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium  text-gray-700 mb-1">Frequency</label>
          <select
            name="frequency"
            value={income.frequency}
            onChange={handleChange}
            className="block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="twicemonthly">Twice Monthly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Pay Day Selectors for Twice Monthly */}
        {income.frequency === "twicemonthly" && (
          <div className="p-3 bg-blue-50 rounded-lg space-y-3">
            <p className="text-sm text-blue-700 font-medium">Select your pay days each month:</p>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">First Pay Day</label>
                <select
                  name="firstPayDay"
                  value={income.firstPayDay || 1}
                  onChange={handleChange}
                  className="block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Second Pay Day</label>
                <select
                  name="secondPayDay"
                  value={income.secondPayDay || 15}
                  onChange={handleChange}
                  className="block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Pay Date</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5  text-gray-400" />
            </div>
            <input
              type="date"
              name="lastPayDate"
              value={income.lastPayDate}
              onChange={handleChange}
              className="pl-10 block w-full rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Savings %</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <PiggyBank className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              name="miscPercent"
              min={0}
              max={100}
              value={income.miscPercent}
              onChange={handleChange}
              className="pl-10 w-24 rounded-md border text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="ml-2 text-gray-500">%</span>
          </div>
        </div>

        
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Months to Project</label>
            <input
              type="number"
              name="monthsToShow"
              min={1}
              value={income.monthsToShow}
              onChange={handleChange}
              className="w-24 rounded-md border pl-1 text-gray-400 border-gray-300 shadow-sm py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        

        {/* Savings Projection Section
        {showMonthsField && income.monthsToShow > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Savings Projection</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Monthly Savings:</span>
                <span className="font-medium text-blue-900">
                  ${calculateMonthlySavings.monthly.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">
                  {income.monthsToShow} Month Projection:
                </span>
                <span className="font-medium text-blue-900">
                  ${calculateMonthlySavings.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}