"use client";
import React, { useState } from "react";
import { Bill, OneTimeBill, AllocatedBill, PaycheckSavings, BillPayment, BillPaycheckAmount } from "./types";
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
  AlertOctagon,
  PiggyBank,
  Edit3,
  Check,
  X,
  TrendingUp,
  Loader2
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
  paycheckSavings: PaycheckSavings[];
  onUpdatePaycheckSavings: (paycheckDate: string, amount: number) => Promise<void>;
  onToggleSavingsDeposited: (savingsId: string, isDeposited: boolean) => Promise<void>;
  getDefaultSavingsForPaycheck: (paycheckAmount: number) => number;
  billPayments: BillPayment[];
  onToggleBillPaid: (paycheckDate: string, billName: string, billDueDate: string, isPaid: boolean) => Promise<void>;
  onAddOneTimeSavings: (amount: number) => Promise<void>;
  oneTimeSavingsTotal: number;
  billPaycheckAmounts: BillPaycheckAmount[];
  onUpdateBillPaycheckAmount: (billName: string, billDueDate: string, paycheckDate: string, amount: number) => Promise<void>;
  onBillMoved?: (billInstanceId: string, paycheckDate: string) => void;
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
  onDeleteOneTimeBill,
  paycheckSavings,
  onUpdatePaycheckSavings,
  onToggleSavingsDeposited,
  getDefaultSavingsForPaycheck,
  billPayments,
  onToggleBillPaid,
  onAddOneTimeSavings,
  oneTimeSavingsTotal,
  billPaycheckAmounts,
  onUpdateBillPaycheckAmount,
  onBillMoved
}: PaymentScheduleProps) {

  const [showSuggestions, setShowSuggestions] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPaycheckDate, setSelectedPaycheckDate] = useState<string>("");
  const [editingSavingsDate, setEditingSavingsDate] = useState<string | null>(null);
  const [editingSavingsAmount, setEditingSavingsAmount] = useState<string>("");
  const [showAddSavingsModal, setShowAddSavingsModal] = useState(false);
  const [oneTimeSavingsInput, setOneTimeSavingsInput] = useState<string>("");
  const [animatingBills, setAnimatingBills] = useState<Set<string>>(new Set());
  const [savingStates, setSavingStates] = useState<Set<string>>(new Set());
  const [loadingBillPayments, setLoadingBillPayments] = useState<Set<string>>(new Set());
  const [loadingSavingsDeposited, setLoadingSavingsDeposited] = useState<Set<string>>(new Set());
  const [loadingOneTimeBills, setLoadingOneTimeBills] = useState<Set<string>>(new Set());
  // State for editing bill amounts per paycheck
  const [editingBillAmountKey, setEditingBillAmountKey] = useState<string | null>(null);
  const [editingBillAmount, setEditingBillAmount] = useState<string>("");
  const [savingBillAmounts, setSavingBillAmounts] = useState<Set<string>>(new Set());

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

  // Get total unpaid one-time bills amount for a paycheck
  const getOneTimeBillsTotal = (payDate: Date): number => {
    const bills = getOneTimeBillsForPaycheck(payDate);
    return bills.filter(bill => !bill.isPaid).reduce((sum, bill) => sum + bill.amount, 0);
  };

  // Check if a bill is paid
  const isBillPaid = (paycheckDate: string, billName: string, billDueDate: string): boolean => {
    return billPayments.some(
      p => p.paycheckDate === paycheckDate && p.billName === billName && p.billDueDate === billDueDate && p.isPaid
    );
  };

  // Handle toggling bill paid with animation
  const handleToggleBillPaid = async (paycheckDate: string, billName: string, billDueDate: string, currentlyPaid: boolean) => {
    const billKey = `${paycheckDate}-${billName}-${billDueDate}`;

    // Add to loading set
    setLoadingBillPayments(prev => new Set(prev).add(billKey));
    setAnimatingBills(prev => new Set(prev).add(billKey));

    try {
      // Call the API
      await onToggleBillPaid(paycheckDate, billName, billDueDate, !currentlyPaid);
    } finally {
      // Remove from loading set
      setLoadingBillPayments(prev => {
        const next = new Set(prev);
        next.delete(billKey);
        return next;
      });

      // Remove from animating set after animation completes
      setTimeout(() => {
        setAnimatingBills(prev => {
          const next = new Set(prev);
          next.delete(billKey);
          return next;
        });
      }, 500);
    }
  };

  // Handle adding one-time savings
  const handleAddOneTimeSavings = async () => {
    const amount = parseFloat(oneTimeSavingsInput);
    if (!isNaN(amount) && amount > 0) {
      await onAddOneTimeSavings(amount);
      setOneTimeSavingsInput("");
      setShowAddSavingsModal(false);
    }
  };

  // Get savings for a specific paycheck date
  const getSavingsForPaycheck = (payDate: Date, paycheckAmount: number): { amount: number; isCustom: boolean; isDeposited: boolean; id?: string } => {
    const dateStr = payDate.toISOString().split('T')[0];
    const customSavings = paycheckSavings.find(s => s.paycheckDate === dateStr);
    if (customSavings) {
      return {
        amount: customSavings.amount,
        isCustom: true,
        isDeposited: customSavings.isDeposited,
        id: customSavings.id
      };
    }
    return {
      amount: getDefaultSavingsForPaycheck(paycheckAmount),
      isCustom: false,
      isDeposited: false
    };
  };

  // Handle starting edit mode for savings
  const handleStartEditSavings = (payDate: Date, currentAmount: number) => {
    const dateStr = payDate.toISOString().split('T')[0];
    setEditingSavingsDate(dateStr);
    setEditingSavingsAmount(currentAmount.toString());
  };

  // Handle saving edited savings amount
  const handleSaveSavings = async (payDate: Date) => {
    const dateStr = payDate.toISOString().split('T')[0];
    const amount = parseFloat(editingSavingsAmount);
    if (!isNaN(amount) && amount >= 0) {
      // Add loading state
      setSavingStates(prev => new Set(prev).add(dateStr));
      try {
        await onUpdatePaycheckSavings(dateStr, amount);
      } finally {
        setSavingStates(prev => {
          const next = new Set(prev);
          next.delete(dateStr);
          return next;
        });
      }
    }
    setEditingSavingsDate(null);
    setEditingSavingsAmount("");
  };

  // Handle canceling edit
  const handleCancelEditSavings = () => {
    setEditingSavingsDate(null);
    setEditingSavingsAmount("");
  };

  // Handle toggling savings deposited with loading state
  const handleToggleSavingsDeposited = async (savingsId: string, isDeposited: boolean) => {
    setLoadingSavingsDeposited(prev => new Set(prev).add(savingsId));
    try {
      await onToggleSavingsDeposited(savingsId, isDeposited);
    } finally {
      setLoadingSavingsDeposited(prev => {
        const next = new Set(prev);
        next.delete(savingsId);
        return next;
      });
    }
  };

  // Handle toggling one-time bill paid with loading state
  const handleToggleOneTimeBillPaid = async (billId: string, isPaid: boolean) => {
    setLoadingOneTimeBills(prev => new Set(prev).add(billId));
    try {
      await onToggleOneTimeBillPaid(billId, isPaid);
    } finally {
      setLoadingOneTimeBills(prev => {
        const next = new Set(prev);
        next.delete(billId);
        return next;
      });
    }
  };

  // Get the bill amount for a specific paycheck (custom or default)
  const getBillAmountForPaycheck = (billName: string, billDueDate: string, paycheckDate: string, defaultAmount: number): { amount: number; isCustom: boolean } => {
    const customAmount = billPaycheckAmounts.find(
      a => a.billName === billName && a.billDueDate === billDueDate && a.paycheckDate === paycheckDate
    );
    if (customAmount) {
      return { amount: customAmount.amount, isCustom: true };
    }
    return { amount: defaultAmount, isCustom: false };
  };

  // Handle starting edit mode for bill amount
  const handleStartEditBillAmount = (billKey: string, currentAmount: number) => {
    setEditingBillAmountKey(billKey);
    setEditingBillAmount(currentAmount.toString());
  };

  // Handle saving edited bill amount
  const handleSaveBillAmount = async (billName: string, billDueDate: string, paycheckDate: string) => {
    const amount = parseFloat(editingBillAmount);
    if (!isNaN(amount) && amount >= 0) {
      const billKey = `${paycheckDate}-${billName}-${billDueDate}`;
      setSavingBillAmounts(prev => new Set(prev).add(billKey));
      try {
        await onUpdateBillPaycheckAmount(billName, billDueDate, paycheckDate, amount);
      } finally {
        setSavingBillAmounts(prev => {
          const next = new Set(prev);
          next.delete(billKey);
          return next;
        });
      }
    }
    setEditingBillAmountKey(null);
    setEditingBillAmount("");
  };

  // Handle canceling bill amount edit
  const handleCancelEditBillAmount = () => {
    setEditingBillAmountKey(null);
    setEditingBillAmount("");
  };

  // Calculate total savings progress
  const calculateSavingsProgress = () => {
    let totalTarget = 0;
    let totalDeposited = 0;

    schedule.forEach(alloc => {
      const savingsInfo = getSavingsForPaycheck(alloc.payDate, alloc.paycheckAmount / (1 - savings.percent / 100));
      totalTarget += savingsInfo.amount;
      if (savingsInfo.isDeposited) {
        totalDeposited += savingsInfo.amount;
      }
    });

    // Add one-time savings to deposited amount
    totalDeposited += oneTimeSavingsTotal;

    return { totalTarget, totalDeposited, percentage: totalTarget > 0 ? (totalDeposited / totalTarget) * 100 : 0 };
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

          // Recalculate isUnderfunded for all bills in both affected paychecks
          const recalculateUnderfunded = (alloc: typeof currentAlloc) => {
            let runningTotal = 0;
            // Sort bills by payment amount (largest first) to match original allocation logic
            const sortedBills = [...alloc.bills].sort((a, b) => b.paymentAmount - a.paymentAmount);

            sortedBills.forEach(bill => {
              const wouldExceed = runningTotal + bill.paymentAmount > alloc.paycheckAmount;
              bill.isUnderfunded = wouldExceed;
              runningTotal += bill.paymentAmount;
            });
          };

          recalculateUnderfunded(currentAlloc);
          recalculateUnderfunded(targetAlloc);

          // Save the bill assignment to persist the move
          if (onBillMoved && movedBill.instanceId) {
            const targetPaycheckDate = targetAlloc.payDate.toISOString().split('T')[0];
            onBillMoved(movedBill.instanceId, targetPaycheckDate);
          }
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

  const savingsProgress = calculateSavingsProgress();

  return (
    <div className="space-y-6">
      {/* Savings Progress Card */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-card overflow-hidden">
        <div className="bg-green-700 px-5 py-4 border-b-2 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-500 p-1.5 rounded">
                <PiggyBank className="w-5 h-5 text-green-900" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wide">Savings Progress</h2>
                <p className="text-green-200 text-xs mt-0.5">Track your savings goals across all paychecks</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{formatCurrency(savingsProgress.totalDeposited)}</p>
                <p className="text-green-200 text-xs">of {formatCurrency(savingsProgress.totalTarget)} target</p>
              </div>
              <button
                onClick={() => setShowAddSavingsModal(true)}
                className="bg-green-500 hover:bg-green-400 text-green-900 p-2 rounded transition-colors"
                title="Add one-time savings deposit"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-neutral-700">Overall Progress</span>
            <span className="text-sm font-bold text-green-700">{savingsProgress.percentage.toFixed(0)}% deposited</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-4">
            <div
              className="h-4 rounded-full bg-green-500 transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${Math.max(savingsProgress.percentage, savingsProgress.percentage > 0 ? 8 : 0)}%` }}
            >
              {savingsProgress.percentage >= 15 && (
                <TrendingUp className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4">
            <div className="text-center p-2 sm:p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Target Rate</p>
              <p className="text-base sm:text-lg font-bold text-neutral-900">{savings.percent}%</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Deposited</p>
              <p className="text-base sm:text-lg font-bold text-green-700">{formatCurrency(savingsProgress.totalDeposited)}</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Bonus</p>
              <p className="text-base sm:text-lg font-bold text-blue-700">{formatCurrency(oneTimeSavingsTotal)}</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-neutral-50 rounded-lg">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Remaining</p>
              <p className="text-base sm:text-lg font-bold text-neutral-900">{formatCurrency(Math.max(0, savingsProgress.totalTarget - savingsProgress.totalDeposited))}</p>
            </div>
          </div>
        </div>
      </div>

      {schedule.map((alloc, index) => {
        const dateStr = alloc.payDate.toISOString().split('T')[0];
        // Calculate gross paycheck (before savings deduction)
        const grossPaycheck = alloc.paycheckAmount / (1 - savings.percent / 100);
        const savingsInfo = getSavingsForPaycheck(alloc.payDate, grossPaycheck);
        const isEditingSavings = editingSavingsDate === dateStr;
        // Include one-time bills in used funds calculation
        const oneTimeBillsAmount = getOneTimeBillsTotal(alloc.payDate);
        const totalUsedFunds = alloc.usedFunds + oneTimeBillsAmount;
        const miscReserved = alloc.paycheckAmount - totalUsedFunds;
        const usedPercentage = (totalUsedFunds / alloc.paycheckAmount) * 100;
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
              <div className="p-2 sm:p-4 border-r border-neutral-200">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                  Paycheck
                  <span className="hidden sm:inline normal-case font-normal ml-1">(after {formatPercent(savings.percent)} savings)</span>
                </p>
                <p className="text-sm sm:text-lg font-bold text-neutral-900">
                  {formatCurrency(alloc.paycheckAmount)}
                </p>
              </div>
              <div className="p-2 sm:p-4 border-r border-neutral-200">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Used</p>
                <p className="text-sm sm:text-lg font-bold text-neutral-900">
                  {formatCurrency(totalUsedFunds)}
                </p>
                {oneTimeBillsAmount > 0 && (
                  <p className="text-xs text-blue-600 hidden sm:block">
                    incl. {formatCurrency(oneTimeBillsAmount)} one-time
                  </p>
                )}
              </div>
              <div className="p-2 sm:p-4">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Remaining</p>
                <p className={`text-sm sm:text-lg font-bold ${miscReserved >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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

            {/* Bills & Savings Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-3 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wide w-12">
                      Done
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Item
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Amount
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      APR
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Due/Type
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {/* Savings Row - Always First */}
                  <tr className={`${savingsInfo.isDeposited ? 'bg-green-50' : 'bg-green-50/50'} transition-colors`}>
                    <td className="px-3 py-4 whitespace-nowrap text-center">
                      {loadingSavingsDeposited.has(savingsInfo.id || dateStr) ? (
                        <div className="w-7 h-7 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            if (savingsInfo.id) {
                              await handleToggleSavingsDeposited(savingsInfo.id, !savingsInfo.isDeposited);
                            } else {
                              // Auto-create the savings record and mark as deposited
                              setLoadingSavingsDeposited(prev => new Set(prev).add(dateStr));
                              try {
                                await onUpdatePaycheckSavings(dateStr, savingsInfo.amount);
                                // After creating, we need to mark it deposited - the parent will re-render with the new id
                              } finally {
                                setLoadingSavingsDeposited(prev => {
                                  const next = new Set(prev);
                                  next.delete(dateStr);
                                  return next;
                                });
                              }
                            }
                          }}
                          className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            savingsInfo.isDeposited
                              ? 'bg-green-500 border-green-500'
                              : 'border-green-300 hover:border-green-400 hover:bg-green-100'
                          }`}
                          title={savingsInfo.isDeposited ? "Mark as not deposited" : "Mark as deposited"}
                        >
                          {savingsInfo.isDeposited && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <PiggyBank className={`w-4 h-4 ${savingsInfo.isDeposited ? 'text-green-500' : 'text-green-600'}`} />
                        <span className={`text-sm font-semibold transition-all duration-300 ${
                          savingsInfo.isDeposited ? 'line-through text-green-500' : 'text-green-700'
                        }`}>
                          Savings Deposit
                        </span>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-200 text-green-800 uppercase tracking-wide">
                          Savings
                        </span>
                        {savingsInfo.isCustom && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-700 uppercase">
                            Custom
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      {isEditingSavings ? (
                        <div className="flex items-center justify-end gap-1">
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                            <input
                              type="number"
                              value={editingSavingsAmount}
                              onChange={(e) => setEditingSavingsAmount(e.target.value)}
                              className="w-24 pl-6 pr-2 py-1 border border-green-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-neutral-900 text-right"
                              step="0.01"
                              min="0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveSavings(alloc.payDate);
                                } else if (e.key === 'Escape') {
                                  handleCancelEditSavings();
                                }
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleSaveSavings(alloc.payDate)}
                            className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                            title="Save"
                            disabled={savingStates.has(dateStr)}
                          >
                            {savingStates.has(dateStr) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelEditSavings}
                            className="p-1 bg-neutral-200 text-neutral-600 rounded hover:bg-neutral-300 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditSavings(alloc.payDate, savingsInfo.amount)}
                          className="group flex items-center justify-end gap-1 hover:bg-green-100 px-2 py-1 rounded transition-colors cursor-pointer"
                          title="Click to edit savings amount"
                        >
                          <span className={`text-sm font-semibold transition-all duration-300 ${
                            savingsInfo.isDeposited ? 'line-through text-green-500' : 'text-green-700'
                          }`}>
                            {formatCurrency(savingsInfo.amount)}
                          </span>
                          <Edit3 className="w-3 h-3 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-green-600">—</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm text-green-600">Transfer</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      {savingsInfo.isDeposited ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Deposited
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-center">
                      {/* No action needed - savings auto-tracks on first interaction */}
                    </td>
                  </tr>
                  {/* Bill Rows */}
                  {alloc.bills.map((bill) => {
                      const dueDate = new Date(bill.dueDate);
                      const payDate = alloc.payDate;
                      const daysDiff = getDateDifference(dueDate, payDate);
                      const isLate = daysDiff > 0;
                      const uniqueKey = `${bill.name}-${bill.dueDate}-${alloc.payDate.toISOString()}`;
                      const billKey = `${dateStr}-${bill.name}-${bill.dueDate}`;
                      const isPaid = isBillPaid(dateStr, bill.name, bill.dueDate);
                      const isAnimating = animatingBills.has(billKey);

                      const rowClass = isPaid
                        ? "bg-green-50/50"
                        : bill.isUnderfunded
                          ? "bg-red-50 hover:bg-red-100"
                          : bill.isCriticallyLate
                            ? "bg-orange-50 hover:bg-orange-100"
                            : "hover:bg-neutral-50";

                      return (
                        <tr
                          key={uniqueKey}
                          className={`${rowClass} transition-colors`}
                        >
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            {loadingBillPayments.has(billKey) ? (
                              <div className="w-7 h-7 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                              </div>
                            ) : (
                              <button
                                onClick={() => handleToggleBillPaid(dateStr, bill.name, bill.dueDate, isPaid)}
                                className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                  isPaid
                                    ? 'bg-green-500 border-green-500'
                                    : 'border-neutral-300 hover:border-green-400 hover:bg-green-50'
                                } ${isAnimating ? 'scale-110' : ''}`}
                                title={isPaid ? "Mark as unpaid" : "Mark as paid"}
                              >
                                {isPaid && (
                                  <Check
                                    className={`w-4 h-4 text-white transition-all duration-300 ${
                                      isAnimating ? 'animate-bounce' : ''
                                    }`}
                                  />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold transition-all duration-300 ${
                                isPaid
                                  ? 'line-through text-neutral-400'
                                  : bill.isUnderfunded
                                    ? 'text-red-900'
                                    : 'text-neutral-900'
                              }`}>
                                {bill.name}
                              </span>
                              {bill.billType === "recurring" && (
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wide ${
                                  isPaid ? 'bg-neutral-300 text-neutral-500' : 'bg-neutral-900 text-white'
                                }`}>
                                  Monthly
                                </span>
                              )}
                              {isPaid && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-700 uppercase tracking-wide flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Paid
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            {(() => {
                              const billAmountInfo = getBillAmountForPaycheck(bill.name, bill.dueDate, dateStr, bill.paymentAmount);
                              const isEditingThisBill = editingBillAmountKey === billKey;
                              const isSavingThisBill = savingBillAmounts.has(billKey);

                              if (isEditingThisBill) {
                                return (
                                  <div className="flex items-center justify-end gap-1">
                                    <div className="relative">
                                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                                      <input
                                        type="number"
                                        value={editingBillAmount}
                                        onChange={(e) => setEditingBillAmount(e.target.value)}
                                        className="w-24 pl-6 pr-2 py-1 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-900 text-right"
                                        step="0.01"
                                        min="0"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleSaveBillAmount(bill.name, bill.dueDate, dateStr);
                                          } else if (e.key === 'Escape') {
                                            handleCancelEditBillAmount();
                                          }
                                        }}
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleSaveBillAmount(bill.name, bill.dueDate, dateStr)}
                                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                                      title="Save"
                                      disabled={isSavingThisBill}
                                    >
                                      {isSavingThisBill ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Check className="w-3 h-3" />
                                      )}
                                    </button>
                                    <button
                                      onClick={handleCancelEditBillAmount}
                                      className="p-1 bg-neutral-200 text-neutral-600 rounded hover:bg-neutral-300 transition-colors"
                                      title="Cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  onClick={() => handleStartEditBillAmount(billKey, billAmountInfo.amount)}
                                  className={`group flex items-center justify-end gap-1 hover:bg-neutral-100 px-2 py-1 rounded transition-colors ${
                                    isPaid ? 'cursor-default' : 'cursor-pointer'
                                  }`}
                                  disabled={isPaid}
                                  title={isPaid ? "Bill is paid" : "Click to edit amount for this paycheck"}
                                >
                                  <span className={`text-sm font-semibold transition-all duration-300 ${
                                    isPaid ? 'line-through text-neutral-400' : 'text-neutral-900'
                                  }`}>
                                    {formatCurrency(billAmountInfo.amount)}
                                  </span>
                                  {billAmountInfo.isCustom && !isPaid && (
                                    <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-700 uppercase">
                                      Custom
                                    </span>
                                  )}
                                  {!isPaid && (
                                    <Edit3 className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </button>
                              );
                            })()}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <span className={`text-sm ${isPaid ? 'text-neutral-400' : 'text-neutral-600'}`}>
                              {bill.apr.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span className={`text-sm ${isPaid ? 'text-neutral-400' : 'text-neutral-600'}`}>
                              {new Date(bill.dueDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric"
                              })}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-1">
                              {/* Timing Status */}
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3" />
                                  Complete
                                </span>
                              ) : bill.isCriticallyLate ? (
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
                              {bill.isUnderfunded && !isPaid && (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-red-500 text-white cursor-help"
                                  title="This paycheck doesn't have enough funds to cover this bill. Use the arrows to move it to a different pay period with more available funds."
                                >
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
                  {/* One-Time Bills - integrated into the same table */}
                  {getOneTimeBillsForPaycheck(alloc.payDate).map((bill) => {
                        const isLoading = loadingOneTimeBills.has(bill.id);
                        const rowClass = bill.isPaid
                          ? "bg-green-50/50"
                          : "hover:bg-neutral-50";

                        return (
                          <tr
                            key={bill.id}
                            className={`${rowClass} transition-colors`}
                          >
                            <td className="px-3 py-4 whitespace-nowrap text-center">
                              {isLoading ? (
                                <div className="w-7 h-7 flex items-center justify-center">
                                  <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleToggleOneTimeBillPaid(bill.id, !bill.isPaid)}
                                  className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                    bill.isPaid
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-neutral-300 hover:border-green-400 hover:bg-green-50'
                                  }`}
                                  title={bill.isPaid ? "Mark as unpaid" : "Mark as paid"}
                                >
                                  {bill.isPaid && (
                                    <Check className="w-4 h-4 text-white" />
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold transition-all duration-300 ${
                                  bill.isPaid
                                    ? 'line-through text-neutral-400'
                                    : 'text-neutral-900'
                                }`}>
                                  {bill.name}
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wide ${
                                  bill.isPaid ? 'bg-neutral-200 text-neutral-500' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  One-Time
                                </span>
                                {bill.isPaid && (
                                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-700 uppercase tracking-wide flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Paid
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-right">
                              <span className={`text-sm font-semibold transition-all duration-300 ${
                                bill.isPaid ? 'line-through text-neutral-400' : 'text-neutral-900'
                              }`}>
                                {formatCurrency(bill.amount)}
                              </span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-right">
                              <span className="text-sm text-neutral-400">—</span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`text-sm ${bill.isPaid ? 'text-neutral-400' : 'text-neutral-600'}`}>
                                {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric"
                                }) : '—'}
                              </span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-center">
                              {bill.isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3" />
                                  Complete
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                  <Clock className="w-3 h-3" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => onDeleteOneTimeBill(bill.id)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded bg-neutral-100 text-neutral-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                                title="Delete this bill"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

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

      {/* Add One-Time Savings Modal */}
      {showAddSavingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-elevated max-w-md w-full overflow-hidden">
            <div className="bg-green-700 px-5 py-4 border-b-2 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 p-1.5 rounded">
                    <PiggyBank className="w-5 h-5 text-green-900" />
                  </div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wide">
                    Add Bonus Savings
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowAddSavingsModal(false);
                    setOneTimeSavingsInput("");
                  }}
                  className="text-green-200 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-neutral-600 mb-4">
                Add extra money you've saved outside of your regular paycheck savings.
                This could be from bonuses, gifts, or spare change you've set aside.
              </p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="number"
                  value={oneTimeSavingsInput}
                  onChange={(e) => setOneTimeSavingsInput(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-10 pr-4 py-3 border border-neutral-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-neutral-900"
                  step="0.01"
                  min="0"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 bg-neutral-50 border-t border-neutral-200">
              <button
                onClick={() => {
                  setShowAddSavingsModal(false);
                  setOneTimeSavingsInput("");
                }}
                className="flex-1 py-2.5 px-4 bg-white border border-neutral-300 text-neutral-700 rounded-lg font-semibold hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOneTimeSavings}
                disabled={!oneTimeSavingsInput || parseFloat(oneTimeSavingsInput) <= 0}
                className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Savings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
