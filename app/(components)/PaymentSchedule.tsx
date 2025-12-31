"use client";
import React, { useState } from "react";
import { Bill } from "./types";
import '../../styles/globals.css';

import { 
  ChevronUp, 
  ChevronDown, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  PiggyBank,
  AlertTriangle
} from "lucide-react";

interface AllocatedBill extends Bill {
  isLate?: boolean;
  instanceId?: string;
}

interface SuggestedChange {
  billName: string;
  originalDate: string;
  suggestedDate: string;
}

interface Allocation {
  payDate: Date;
  bills: AllocatedBill[];
  suggestedChanges: SuggestedChange[];
  usedFunds: number;
  paycheckAmount: number;
}

interface PaymentScheduleProps {
  schedule: Allocation[];
  setScheduleAction: React.Dispatch<React.SetStateAction<Allocation[]>>;
  savings: { monthly: number; total: number; percent: number };
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

const getDateDifference = (date1: Date, date2: Date): number => {
  return Math.floor(
    (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24)
  );
};

const formatPercent = (value: number): string =>
  new Intl.NumberFormat("en-US", { 
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value / 100);

export default function PaymentSchedule({
  schedule,
  setScheduleAction,
  savings
}: PaymentScheduleProps) {

  const [showSuggestions, setShowSuggestions] = useState(true);

  const moveBill = (
    billName: string,
    fromDate: Date,
    direction: "up" | "down"
  ) => {
    const updatedSchedule = [...schedule];
    
    const currentIndex = updatedSchedule.findIndex(
      (alloc) => alloc.payDate.getTime() === fromDate.getTime()
    );

    if (currentIndex !== -1) {
      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex >= 0 && targetIndex < updatedSchedule.length) {
        const currentAlloc = updatedSchedule[currentIndex];
        const targetAlloc = updatedSchedule[targetIndex];

        const billIndex = currentAlloc.bills.findIndex(
          (b) => b.name === billName
        );
        if (billIndex !== -1) {
          const [movedBill] = currentAlloc.bills.splice(billIndex, 1);
          targetAlloc.bills.push(movedBill);

          currentAlloc.usedFunds -= movedBill.paymentAmount;
          targetAlloc.usedFunds += movedBill.paymentAmount;
        }
      }
    }

    setScheduleAction(updatedSchedule);
  };

  if (!schedule.length) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            Enter income, last pay date, and bills to see a schedule.
          </p>
        </div>
      </div>
    );
  }

  const getProgressBarColor = (availablePercentage: number) => {
    if (availablePercentage >= 70) return "bg-green-500";
    if (availablePercentage >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {/* <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <PiggyBank className="w-8 h-8" />
            <div>
              <p className="text-blue-100">Monthly Savings</p>
              <p className="text-2xl font-bold">
                {formatCurrency(savings.monthly)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8" />
            <div>
              <p className="text-blue-100">Projected Total Savings</p>
              <p className="text-2xl font-bold">
                {formatCurrency(savings.total)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8" />
            <div>
              <p className="text-blue-100">Payment Periods</p>
              <p className="text-2xl font-bold">{schedule.length}</p>
            </div>
          </div>
        </div>
      </div> */}
   
      <div className="flex justify-center">
                  {/* <button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className={`inline-flex items-center px-4 py-2 m-4 rounded-md text-sm font-medium transition-colors duration-200 ${
                      showSuggestions
                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 mr-2 ${
                        showSuggestions ? "text-yellow-500" : "text-gray-500"
                      }`}
                    />
                    {showSuggestions ? "Hide Suggestions" : "Show Suggestions"}
                  </button> */}
                </div>

      {schedule.map((alloc, index) => {
        const miscReserved = alloc.paycheckAmount - alloc.usedFunds;
        const usedPercentage = (alloc.usedFunds / alloc.paycheckAmount) * 100;
        const availablePercentage = 100 - usedPercentage;
        const progressBarColor = getProgressBarColor(availablePercentage);

        

        return (
          <div key={alloc.payDate.toISOString()} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Calendar className="w-6 h-6 mr-2 text-blue-500" />
                  {alloc.payDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-row">
                  <p className="text-sm text-gray-500 ">Total Paycheck</p>
                  <p className="text-xs font-semibold ml-1 text-gray-500 self-center">(After {formatPercent(savings.percent)} Savings)</p>
                  </div>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatCurrency(alloc.paycheckAmount)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Used Funds</p>
                  <p className="text-xl font-semibold text-blue-600">
                    {formatCurrency(alloc.usedFunds)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">
                    Available After Bills
                  </p>
                  <p className="text-xl font-semibold text-green-600">
                    {formatCurrency(miscReserved)}
                  </p>
                </div>
              </div>

              <div className="relative w-full">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${progressBarColor}`}
                    style={{ width: `${usedPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-600">
                    Used: {usedPercentage.toFixed(1)}%
                  </span>
                  <span className="text-gray-600">
                    Available: {availablePercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {alloc.bills.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bill Name
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        APR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {alloc.bills.map((bill) => {
                      const dueDate = new Date(bill.dueDate);
                      const payDate = alloc.payDate;
                      const daysDiff = getDateDifference(dueDate, payDate);
                      const isLate = daysDiff > 0;
                      const uniqueKey = `${bill.name}-${
                        bill.dueDate
                      }-${alloc.payDate.toISOString()}`;

                      return (
                        <tr
                          key={uniqueKey}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900">
                                {bill.name}
                              </span>
                              {bill.billType === "recurring" && (
                                <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  Recurring
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            <span className="flex items-center justify-end">
                              <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                              {formatCurrency(bill.paymentAmount).replace(
                                "$",
                                ""
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {bill.apr.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(bill.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {isLate ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Clock className="w-3 h-3 mr-1" />
                                {daysDiff} days late
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                On Time
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() =>
                                  moveBill(bill.name, alloc.payDate, "up")
                                }
                                disabled={index === 0}
                                aria-label="Move up"
                              >
                                <ChevronUp className="w-5 h-5 text-gray-600" />
                              </button>
                              <button
                                className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                onClick={() =>
                                  moveBill(bill.name, alloc.payDate, "down")
                                }
                                disabled={index === schedule.length - 1}
                                aria-label="Move down"
                              >
                                <ChevronDown className="w-5 h-5 text-gray-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No bills assigned to this paycheck.
              </div>
            )}

            {showSuggestions && alloc.suggestedChanges.length > 0 && (
              <div className="bg-yellow-50 p-4 border-t border-yellow-100">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <h4 className="font-medium text-yellow-800">
                    Recommended Move
                  </h4>
                </div>
                {/* Only show the first (best) suggestion */}
                <div className="text-sm text-yellow-700">
                  <span className="font-medium">
                    {alloc.suggestedChanges[0].billName}
                  </span>
                  : Consider moving from{" "}
                  {new Date(
                    alloc.suggestedChanges[0].originalDate
                  ).toLocaleDateString()}
                  to{" "}
                  {new Date(
                    alloc.suggestedChanges[0].suggestedDate
                  ).toLocaleDateString()}{" "}
                  for optimal cash flow
                </div>
              </div>
            )}
          </div>

        );
      })}
    </div>
  
    
  );
}
