"use client";
import React, { useState } from "react";
import { Bill, OneTimeBill, AllocatedBill } from "./types";
import AddOneTimeBillModal from "./AddOneTimeBillModal";
import '../../styles/globals.css';

import {
  ChevronUp,
  ChevronDown,
  DollarSign,
  Calendar,
  AlertCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  AlertOctagon
} from "lucide-react";

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
  sourceName?: string;  // Name of the income source for this paycheck
  sourceId?: string;    // ID of the income source
}

interface PaymentScheduleProps {
  schedule: Allocation[];
  setScheduleAction: React.Dispatch<React.SetStateAction<Allocation[]>>;
  savings: { monthly: number; total: number; percent: number };
  oneTimeBills: OneTimeBill[];
  onAddOneTimeBill: (paycheckDate: string, bill: { name: string; amount: number; dueDate?: string }) => Promise<void>;
  onToggleOneTimeBillPaid: (billId: string, isPaid: boolean) => Promise<void>;
  onDeleteOneTimeBill: (billId: string) => Promise<void>;
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
  savings,
  oneTimeBills,
  onAddOneTimeBill,
  onToggleOneTimeBillPaid,
  onDeleteOneTimeBill
}: PaymentScheduleProps) {

  const [showSuggestions, setShowSuggestions] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPaycheckDate, setSelectedPaycheckDate] = useState<string>("");

  const handleOpenAddModal = (payDate: Date) => {
    // Format date as YYYY-MM-DD for the modal
    const dateStr = payDate.toISOString().split('T')[0];
    setSelectedPaycheckDate(dateStr);
    setModalOpen(true);
  };

  const handleAddBill = async (bill: { name: string; amount: number; dueDate?: string }) => {
    await onAddOneTimeBill(selectedPaycheckDate, bill);
  };

  // Get one-time bills for a specific paycheck date
  const getOneTimeBillsForPaycheck = (payDate: Date): OneTimeBill[] => {
    const dateStr = payDate.toISOString().split('T')[0];
    return oneTimeBills.filter(bill => bill.paycheckDate === dateStr);
  };

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
      <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
        <div className="bg-neutral-900 px-5 py-4 border-b-2 border-primary-500">
          <h2 className="text-base font-bold text-white uppercase tracking-wide">Payment Schedule</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-neutral-400" />
          </div>
          <p className="text-neutral-600 font-medium text-center">
            Enter income, last pay date, and bills to generate your schedule
          </p>
          <p className="text-neutral-400 text-sm mt-2 text-center">
            Your payment schedule will appear here
          </p>
        </div>
      </div>
    );
  }

  const getProgressBarColor = (availablePercentage: number) => {
    if (availablePercentage >= 70) return "bg-green-500";
    if (availablePercentage >= 40) return "bg-primary-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {schedule.map((alloc, index) => {
        const miscReserved = alloc.paycheckAmount - alloc.usedFunds;
        const usedPercentage = (alloc.usedFunds / alloc.paycheckAmount) * 100;
        const availablePercentage = 100 - usedPercentage;
        const progressBarColor = getProgressBarColor(availablePercentage);

        return (
          <div key={alloc.payDate.toISOString()} className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
            {/* Pay Period Header */}
            <div className="bg-neutral-900 px-5 py-4 border-b-2 border-primary-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-500 p-1.5 rounded">
                    <Calendar className="w-4 h-4 text-neutral-900" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-wide">
                      {alloc.payDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </h3>
                    <p className="text-neutral-400 text-xs mt-0.5">
                      {alloc.sourceName ? (
                        <span className="text-primary-400">{alloc.sourceName}</span>
                      ) : (
                        `Pay Period ${index + 1}`
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-neutral-400 uppercase tracking-wide">Available</p>
                    <p className="text-lg font-bold text-primary-500">{formatCurrency(miscReserved)}</p>
                  </div>
                  <button
                    onClick={() => handleOpenAddModal(alloc.payDate)}
                    className="bg-primary-500 hover:bg-primary-400 text-neutral-900 p-2 rounded transition-colors"
                    title="Add one-time bill to this paycheck"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 border-b border-neutral-200">
              <div className="p-4 border-r border-neutral-200">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                  Paycheck
                  <span className="normal-case font-normal ml-1">(after {formatPercent(savings.percent)} savings)</span>
                </p>
                <p className="text-lg font-bold text-neutral-900">
                  {formatCurrency(alloc.paycheckAmount)}
                </p>
              </div>
              <div className="p-4 border-r border-neutral-200">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Used</p>
                <p className="text-lg font-bold text-neutral-900">
                  {formatCurrency(alloc.usedFunds)}
                </p>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Remaining</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(miscReserved)}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-5 py-4 bg-neutral-50 border-b border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Budget Usage</span>
                <span className="text-xs font-semibold text-neutral-700">{usedPercentage.toFixed(0)}% used</span>
              </div>
              <div className="w-full bg-neutral-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${progressBarColor}`}
                  style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Bills Table */}
            {alloc.bills.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        Bill
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        Amount
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        APR
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        Due
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        Move
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {alloc.bills.map((bill) => {
                      const dueDate = new Date(bill.dueDate);
                      const payDate = alloc.payDate;
                      const daysDiff = getDateDifference(dueDate, payDate);
                      const isLate = daysDiff > 0;
                      const uniqueKey = `${bill.name}-${bill.dueDate}-${alloc.payDate.toISOString()}`;

                      const rowClass = bill.isUnderfunded
                        ? "bg-red-50 hover:bg-red-100"
                        : bill.isCriticallyLate
                          ? "bg-orange-50 hover:bg-orange-100"
                          : "hover:bg-neutral-50";

                      return (
                        <tr
                          key={uniqueKey}
                          className={`${rowClass} transition-colors`}
                        >
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${bill.isUnderfunded ? 'text-red-900' : 'text-neutral-900'}`}>
                                {bill.name}
                              </span>
                              {bill.billType === "recurring" && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-neutral-900 text-white uppercase tracking-wide">
                                  Monthly
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-neutral-900">
                              {formatCurrency(bill.paymentAmount)}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <span className="text-sm text-neutral-600">
                              {bill.apr.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className="text-sm text-neutral-600">
                              {new Date(bill.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric"
                              })}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-1">
                              {/* Timing Status */}
                              {bill.isCriticallyLate ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                                  <AlertOctagon className="w-3 h-3" />
                                  {daysDiff}d late!
                                </span>
                              ) : isLate ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-primary-100 text-primary-800">
                                  <Clock className="w-3 h-3" />
                                  {daysDiff}d late
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3" />
                                  On Time
                                </span>
                              )}
                              {/* Underfunded Warning */}
                              {bill.isUnderfunded && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-red-500 text-white">
                                  <AlertTriangle className="w-3 h-3" />
                                  Underfunded
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                className="inline-flex items-center justify-center w-7 h-7 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                onClick={() =>
                                  moveBill(bill.name, alloc.payDate, "up")
                                }
                                disabled={index === 0}
                                aria-label="Move to earlier paycheck"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                className="inline-flex items-center justify-center w-7 h-7 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-900 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                onClick={() =>
                                  moveBill(bill.name, alloc.payDate, "down")
                                }
                                disabled={index === schedule.length - 1}
                                aria-label="Move to later paycheck"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* One-Time Bills Section */}
            {(() => {
              const paycheckOneTimeBills = getOneTimeBillsForPaycheck(alloc.payDate);
              if (paycheckOneTimeBills.length === 0 && alloc.bills.length === 0) {
                return (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <DollarSign className="w-6 h-6 text-neutral-400" />
                    </div>
                    <p className="text-neutral-500 font-medium">No bills for this pay period</p>
                    <p className="text-neutral-400 text-sm mt-1">Click the + button to add a one-time bill</p>
                  </div>
                );
              }
              if (paycheckOneTimeBills.length === 0) return null;

              return (
                <div className="border-t border-neutral-200">
                  <div className="bg-blue-50 px-5 py-3 border-b border-blue-100">
                    <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5" />
                      One-Time Bills ({paycheckOneTimeBills.length})
                    </h4>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {paycheckOneTimeBills.map((bill) => (
                      <div
                        key={bill.id}
                        className={`flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors ${
                          bill.isPaid ? 'bg-green-50/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={bill.isPaid}
                            onChange={(e) => onToggleOneTimeBillPaid(bill.id, e.target.checked)}
                            className="w-5 h-5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500 cursor-pointer"
                          />
                          <div className={bill.isPaid ? 'line-through text-neutral-400' : ''}>
                            <span className="text-sm font-semibold text-neutral-900">
                              {bill.name}
                            </span>
                            {bill.dueDate && (
                              <span className="text-xs text-neutral-500 ml-2">
                                Due: {new Date(bill.dueDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric"
                                })}
                              </span>
                            )}
                          </div>
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 uppercase tracking-wide">
                            One-Time
                          </span>
                          {bill.isPaid && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800 uppercase tracking-wide flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Paid
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-sm font-semibold ${bill.isPaid ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>
                            {formatCurrency(bill.amount)}
                          </span>
                          <button
                            onClick={() => onDeleteOneTimeBill(bill.id)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded bg-neutral-100 text-neutral-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                            title="Delete this bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Suggestions Section */}
            {showSuggestions && alloc.suggestedChanges.length > 0 && (
              <div className="bg-primary-50 p-4 border-t border-primary-200">
                <div className="flex items-start gap-3">
                  <div className="bg-primary-500 p-1.5 rounded flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-neutral-900" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary-900 text-sm">
                      Recommended Adjustment
                    </h4>
                    <p className="text-sm text-primary-700 mt-1">
                      <span className="font-semibold">{alloc.suggestedChanges[0].billName}</span>
                      : Consider moving from{" "}
                      {new Date(alloc.suggestedChanges[0].originalDate).toLocaleDateString()}
                      {" "}to{" "}
                      {new Date(alloc.suggestedChanges[0].suggestedDate).toLocaleDateString()}
                      {" "}for better cash flow
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add One-Time Bill Modal */}
      <AddOneTimeBillModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddBill}
        paycheckDate={selectedPaycheckDate}
      />
    </div>
  );
}
