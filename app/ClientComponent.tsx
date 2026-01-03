"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Income, IncomeSource, Bill, OneTimeBill, AllocatedBill, PaycheckSavings, BillPayment, BillPaycheckAmount } from "./(components)/types";
import IncomeForm from "./(components)/IncomeForm";
import BillForm from "./(components)/BillForm";
import BillList from "./(components)/BillList/BillList";
import PaymentSchedule from "./(components)/PaymentSchedule";
import {
  Download,
  Wallet,
  TrendingUp,
  HelpCircle,
  X,
  DollarSign,
  Calendar,
  PiggyBank,
  LogOut,
  User
} from "lucide-react";
import { useAuth } from "./context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/globals.css";

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

export default function BudgetPlanner() {
  const [income, setIncome] = useState<Income>({
    sources: [],
    miscPercent: 30,
    monthsToShow: 1,
  });

  const [savings, setSavings] = useState({ monthly: 0, total: 0, percent: 0 });
  const [bills, setBills] = useState<Bill[]>([]);
  const [schedule, setSchedule] = useState<Allocation[]>([]);
  const [oneTimeBills, setOneTimeBills] = useState<OneTimeBill[]>([]);
  const [paycheckSavings, setPaycheckSavings] = useState<PaycheckSavings[]>([]);
  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
  const [billPaycheckAmounts, setBillPaycheckAmounts] = useState<BillPaycheckAmount[]>([]);
  const [oneTimeSavingsTotal, setOneTimeSavingsTotal] = useState<number>(0);
  const [isSavingIncome, setIsSavingIncome] = useState(false);
  // Track manual bill-to-paycheck assignments (when user moves bills)
  const [billAssignments, setBillAssignments] = useState<Record<string, string>>({});
  const { user, logout } = useAuth();

  // Load bill assignments from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('billAssignments');
    if (saved) {
      try {
        setBillAssignments(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse bill assignments:', e);
      }
    }
  }, []);

  // Save bill assignments to localStorage
  const saveBillAssignment = (billInstanceId: string, paycheckDate: string) => {
    setBillAssignments(prev => {
      const updated = { ...prev, [billInstanceId]: paycheckDate };
      localStorage.setItem('billAssignments', JSON.stringify(updated));
      return updated;
    });
  };

  // Fetch all data on mount when user is logged in
  useEffect(() => {
    const fetchIncome = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/income');
        if (response.ok) {
          const data = await response.json();
          if (data.sources && data.sources.length > 0) {
            setIncome({
              sources: data.sources.map((s: { id: string; name: string; amount: number; frequency: string; lastPayDate: string; firstPayDay?: number; secondPayDay?: number }) => ({
                id: s.id,
                name: s.name,
                amount: s.amount,
                frequency: s.frequency as "weekly" | "biweekly" | "twicemonthly" | "monthly",
                lastPayDate: s.lastPayDate,
                firstPayDay: s.firstPayDay,
                secondPayDay: s.secondPayDay
              })),
              miscPercent: data.settings?.miscPercent || 30,
              monthsToShow: data.settings?.monthsToShow || 1
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch income:', error);
      }
    };

    const fetchBills = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/bills');
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setBills(data.map((b: { id: string; name: string; paymentAmount: number; apr: number; remainingBalance: number; dueDate: string; billType: string; allowableLateDay: number }) => ({
              id: b.id,
              name: b.name,
              paymentAmount: b.paymentAmount,
              apr: b.apr,
              remainingBalance: b.remainingBalance,
              dueDate: b.dueDate,
              billType: b.billType as "recurring" | "one-time" | "other",
              allowableLateDay: b.allowableLateDay
            })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch bills:', error);
      }
    };

    const fetchOneTimeBills = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/one-time-bills');
        if (response.ok) {
          const data = await response.json();
          setOneTimeBills(data);
        }
      } catch (error) {
        console.error('Failed to fetch one-time bills:', error);
      }
    };

    const fetchPaycheckSavings = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/paycheck-savings');
        if (response.ok) {
          const data = await response.json();
          setPaycheckSavings(data);
        }
      } catch (error) {
        console.error('Failed to fetch paycheck savings:', error);
      }
    };

    const fetchBillPayments = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/bill-payments');
        if (response.ok) {
          const data = await response.json();
          setBillPayments(data);
        }
      } catch (error) {
        console.error('Failed to fetch bill payments:', error);
      }
    };

    const fetchBillPaycheckAmounts = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/bill-paycheck-amounts');
        if (response.ok) {
          const data = await response.json();
          setBillPaycheckAmounts(data);
        }
      } catch (error) {
        console.error('Failed to fetch bill paycheck amounts:', error);
      }
    };

    // Load one-time savings from localStorage
    const savedOneTimeSavings = localStorage.getItem('oneTimeSavingsTotal');
    if (savedOneTimeSavings) {
      setOneTimeSavingsTotal(parseFloat(savedOneTimeSavings));
    }

    fetchIncome();
    fetchBills();
    fetchOneTimeBills();
    fetchPaycheckSavings();
    fetchBillPayments();
    fetchBillPaycheckAmounts();
  }, [user]);

  // Handler to add a new one-time bill
  const handleAddOneTimeBill = async (
    paycheckDate: string,
    bill: { name: string; amount: number; dueDate?: string }
  ) => {
    try {
      const response = await fetch('/api/one-time-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: bill.name,
          amount: bill.amount,
          paycheckDate,
          dueDate: bill.dueDate || null,
        }),
      });
      if (response.ok) {
        const newBill = await response.json();
        setOneTimeBills((prev) => [...prev, newBill]);
      }
    } catch (error) {
      console.error('Failed to add one-time bill:', error);
    }
  };

  // Handler to toggle paid status
  const handleToggleOneTimeBillPaid = async (billId: string, isPaid: boolean) => {
    try {
      const response = await fetch(`/api/one-time-bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid }),
      });
      if (response.ok) {
        setOneTimeBills((prev) =>
          prev.map((bill) =>
            bill.id === billId ? { ...bill, isPaid } : bill
          )
        );
      }
    } catch (error) {
      console.error('Failed to update one-time bill:', error);
    }
  };

  // Handler to delete a one-time bill
  const handleDeleteOneTimeBill = async (billId: string) => {
    try {
      const response = await fetch(`/api/one-time-bills/${billId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setOneTimeBills((prev) => prev.filter((bill) => bill.id !== billId));
      }
    } catch (error) {
      console.error('Failed to delete one-time bill:', error);
    }
  };

  // Handler to update paycheck savings (create or update)
  const handleUpdatePaycheckSavings = async (paycheckDate: string, amount: number) => {
    try {
      const response = await fetch('/api/paycheck-savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paycheckDate, amount }),
      });
      if (response.ok) {
        const updatedSavings = await response.json();
        setPaycheckSavings((prev) => {
          const existingIndex = prev.findIndex(s => s.paycheckDate === paycheckDate);
          if (existingIndex >= 0) {
            const newSavings = [...prev];
            newSavings[existingIndex] = updatedSavings;
            return newSavings;
          }
          return [...prev, updatedSavings];
        });
      }
    } catch (error) {
      console.error('Failed to update paycheck savings:', error);
    }
  };

  // Handler to toggle savings deposited status
  const handleToggleSavingsDeposited = async (savingsId: string, isDeposited: boolean) => {
    try {
      const response = await fetch(`/api/paycheck-savings/${savingsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeposited }),
      });
      if (response.ok) {
        setPaycheckSavings((prev) =>
          prev.map((s) =>
            s.id === savingsId ? { ...s, isDeposited } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to update savings status:', error);
    }
  };

  // Handler to toggle bill paid status
  const handleToggleBillPaid = async (
    paycheckDate: string,
    billName: string,
    billDueDate: string,
    isPaid: boolean
  ) => {
    try {
      const response = await fetch('/api/bill-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paycheckDate, billName, billDueDate, isPaid }),
      });
      if (response.ok) {
        if (isPaid) {
          const newPayment = await response.json();
          setBillPayments((prev) => [...prev.filter(p =>
            !(p.paycheckDate === paycheckDate && p.billName === billName && p.billDueDate === billDueDate)
          ), newPayment]);
        } else {
          setBillPayments((prev) =>
            prev.filter(p =>
              !(p.paycheckDate === paycheckDate && p.billName === billName && p.billDueDate === billDueDate)
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to toggle bill payment:', error);
    }
  };

  // Handler to add one-time savings (stored in localStorage for now)
  const handleAddOneTimeSavings = async (amount: number) => {
    const newTotal = oneTimeSavingsTotal + amount;
    setOneTimeSavingsTotal(newTotal);
    localStorage.setItem('oneTimeSavingsTotal', newTotal.toString());
  };

  // Handler to update bill paycheck amount (override for specific paycheck)
  const handleUpdateBillPaycheckAmount = async (
    billName: string,
    billDueDate: string,
    paycheckDate: string,
    amount: number
  ) => {
    try {
      const response = await fetch('/api/bill-paycheck-amounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billName, billDueDate, paycheckDate, amount }),
      });
      if (response.ok) {
        const updatedAmount = await response.json();
        setBillPaycheckAmounts((prev) => {
          const existingIndex = prev.findIndex(
            a => a.billName === billName && a.billDueDate === billDueDate && a.paycheckDate === paycheckDate
          );
          if (existingIndex >= 0) {
            const newAmounts = [...prev];
            newAmounts[existingIndex] = updatedAmount;
            return newAmounts;
          }
          return [...prev, updatedAmount];
        });
      }
    } catch (error) {
      console.error('Failed to update bill paycheck amount:', error);
    }
  };

  // Handler to save income to database
  const handleSaveIncome = async () => {
    if (!user) return;
    setIsSavingIncome(true);
    try {
      const response = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: income.sources,
          miscPercent: income.miscPercent,
          monthsToShow: income.monthsToShow
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save income');
      }
    } catch (error) {
      console.error('Failed to save income:', error);
    } finally {
      setIsSavingIncome(false);
    }
  };

  // Handler to add a bill to database
  const handleAddBill = async (bill: Omit<Bill, 'id'>): Promise<Bill | null> => {
    if (!user) return null;
    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bill),
      });
      if (response.ok) {
        const savedBill = await response.json();
        return savedBill;
      } else if (response.status === 409) {
        // Duplicate bill
        console.warn('A bill with this name and due date already exists');
        return null;
      }
      throw new Error('Failed to add bill');
    } catch (error) {
      console.error('Failed to add bill:', error);
      return null;
    }
  };

  // Calculate default savings for a paycheck based on percentage
  const getDefaultSavingsForPaycheck = (grossPaycheckAmount: number): number => {
    return grossPaycheckAmount * (income.miscPercent / 100);
  };

  // Helper function for consistent currency formatting
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatPercent = (value: number): string =>
    new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  const handleSavingsCalculated = (savingsData: {
    monthly: number;
    total: number;
    percent: number;
  }) => {
    setSavings(savingsData);
  };

  // Helper function to calculate monthly income for a single source
  const calculateMonthlyForSource = (source: IncomeSource): number => {
    switch (source.frequency) {
      case "weekly":
        return source.amount * 4.345;
      case "biweekly":
        return source.amount * 2;
      case "twicemonthly":
        return source.amount * 2;
      case "monthly":
      default:
        return source.amount;
    }
  };

  // Calculate Monthly and Yearly Income (aggregated from all sources)
  const monthlyIncome = useMemo(() => {
    return income.sources.reduce((total, source) => {
      return total + calculateMonthlyForSource(source);
    }, 0);
  }, [income.sources]);

  const yearlyIncome = monthlyIncome * 12;

  // Interface for pay dates with source info
  interface PayDateWithSource {
    date: Date;
    sourceId: string;
    sourceName: string;
    amount: number;
  }

  // Generate Pay Dates for a single source
  const generatePayDatesForSource = (source: IncomeSource, monthsToShow: number): PayDateWithSource[] => {
    if (!source.lastPayDate) return [];
    const startDate = new Date(source.lastPayDate);
    const payDatesArray: PayDateWithSource[] = [];

    const createPayDate = (date: Date): PayDateWithSource => ({
      date,
      sourceId: source.id,
      sourceName: source.name,
      amount: source.amount
    });

    switch (source.frequency) {
      case "weekly":
        for (let i = 0; i < Math.round(4.345 * monthsToShow); i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i * 7);
          payDatesArray.push(createPayDate(date));
        }
        break;
      case "biweekly":
        for (let i = 0; i < 2 * monthsToShow; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i * 14);
          payDatesArray.push(createPayDate(date));
        }
        break;
      case "twicemonthly":
        const firstPayDay = source.firstPayDay || 1;
        const secondPayDay = source.secondPayDay || 15;
        const [earlierDay, laterDay] = firstPayDay < secondPayDay
          ? [firstPayDay, secondPayDay]
          : [secondPayDay, firstPayDay];

        for (let i = 0; i < monthsToShow; i++) {
          const year = startDate.getFullYear();
          const month = startDate.getMonth() + i;
          const actualYear = year + Math.floor(month / 12);
          const actualMonth = month % 12;
          const lastDayOfMonth = new Date(actualYear, actualMonth + 1, 0).getDate();

          const firstDate = new Date(actualYear, actualMonth, Math.min(earlierDay, lastDayOfMonth));
          if (firstDate >= startDate || i > 0) {
            payDatesArray.push(createPayDate(firstDate));
          }

          const secondDate = new Date(actualYear, actualMonth, Math.min(laterDay, lastDayOfMonth));
          if (secondDate >= startDate || i > 0) {
            payDatesArray.push(createPayDate(secondDate));
          }
        }
        payDatesArray.sort((a, b) => a.date.getTime() - b.date.getTime());
        break;
      case "monthly":
        for (let i = 0; i < monthsToShow; i++) {
          const date = new Date(startDate);
          date.setMonth(startDate.getMonth() + i);
          payDatesArray.push(createPayDate(date));
        }
        break;
    }
    return payDatesArray;
  };

  // Generate Pay Dates from all sources
  const payDatesWithSources = useMemo(() => {
    const monthsToShow = income.monthsToShow || 2;
    const allPayDates: PayDateWithSource[] = [];

    income.sources.forEach(source => {
      const sourceDates = generatePayDatesForSource(source, monthsToShow);
      allPayDates.push(...sourceDates);
    });

    // Sort all pay dates chronologically
    return allPayDates.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [income.sources, income.monthsToShow]);

  // Legacy payDates array for compatibility (just the dates)
  const payDates = useMemo(() => {
    return payDatesWithSources.map(p => p.date);
  }, [payDatesWithSources]);

  // Generate the payment schedule based on pay dates and bills
  // Payment Schedule Funtions

  useEffect(() => {
    if (!bills.length || !payDatesWithSources.length) {
      setSchedule([]);
      return;
    }

    const miscReserveFactor = income.miscPercent / 100;

    // Helper functions moved to the top
    const createDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    };

    const getDaysBetween = (date1: Date, date2: Date): number => {
      const d1 = new Date(
        Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate())
      );
      const d2 = new Date(
        Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate())
      );
      return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getPayPeriodLength = (): number => {
      if (payDates.length < 2) return 14; // Default to bi-weekly
      return getDaysBetween(payDates[0], payDates[1]);
    };

    // Calculate extended allocation period using payDatesWithSources
    const allocationPayDatesWithSources = [...payDatesWithSources];
    if (payDatesWithSources.length >= 2) {
      const lastPayDate = payDatesWithSources[payDatesWithSources.length - 1];
      const lastDate = new Date(
        Date.UTC(
          lastPayDate.date.getFullYear(),
          lastPayDate.date.getMonth(),
          lastPayDate.date.getDate()
        )
      );
      const payPeriodDays = getDaysBetween(payDatesWithSources[0].date, payDatesWithSources[1].date);

      // Add two extra pay periods for calculation purposes
      for (let i = 0; i < 2; i++) {
        const nextDate = new Date(
          Date.UTC(
            lastDate.getUTCFullYear(),
            lastDate.getUTCMonth(),
            lastDate.getUTCDate() + payPeriodDays
          )
        );
        // Use the last source for extended dates
        allocationPayDatesWithSources.push({
          date: nextDate,
          sourceId: lastPayDate.sourceId,
          sourceName: lastPayDate.sourceName,
          amount: lastPayDate.amount
        });
        lastDate.setUTCDate(lastDate.getUTCDate() + payPeriodDays);
      }
    }

    // Initialize allocations with all required properties including source info
    const allocations: Allocation[] = allocationPayDatesWithSources.map((payDateInfo) => ({
      payDate: payDateInfo.date,
      bills: [],
      suggestedChanges: [],
      usedFunds: 0,
      paycheckAmount: payDateInfo.amount * (1 - miscReserveFactor),
      sourceName: payDateInfo.sourceName,
      sourceId: payDateInfo.sourceId,
    }));

    // Keep track of allocationPayDates for compatibility
    const allocationPayDates = allocationPayDatesWithSources.map(p => p.date);

    // Expand recurring bills with unique IDs
    const expandedBills: (Bill & { instanceId?: string; baseId?: string })[] =
      [];
    bills.forEach((bill) => {
      const baseId = `${bill.name}-${bill.dueDate}`;

      if (bill.billType === "recurring") {
        const billDueDate = createDate(bill.dueDate);
        const endDate = new Date(
          Date.UTC(
            allocationPayDates[allocationPayDates.length - 1].getFullYear(),
            allocationPayDates[allocationPayDates.length - 1].getMonth(),
            allocationPayDates[allocationPayDates.length - 1].getDate()
          )
        );
        let instanceCount = 0;

        while (billDueDate.getTime() <= endDate.getTime()) {
          const currentDueDate = new Date(
            Date.UTC(
              billDueDate.getUTCFullYear(),
              billDueDate.getUTCMonth(),
              billDueDate.getUTCDate()
            )
          );

          expandedBills.push({
            ...bill,
            dueDate: currentDueDate.toISOString().split("T")[0],
            instanceId: `${
              bill.name
            }-${instanceCount}-${currentDueDate.toISOString()}`,
            baseId: baseId,
          });

          // Move to next month while preserving the day
          const nextMonth = billDueDate.getUTCMonth() + 1;
          const nextYear =
            billDueDate.getUTCFullYear() + Math.floor(nextMonth / 12);
          const targetMonth = nextMonth % 12;

          billDueDate.setUTCFullYear(nextYear);
          billDueDate.setUTCMonth(targetMonth);

          // Handle month end dates correctly
          const targetDay = billDueDate.getUTCDate();
          if (billDueDate.getUTCDate() !== targetDay) {
            billDueDate.setUTCDate(targetDay);
          }

          instanceCount++;
        }
      } else {
        expandedBills.push({
          ...bill,
          instanceId: `${bill.name}-single-${bill.dueDate}`,
          baseId: baseId,
        });
      }
    });

    // Sort bills by due date
    const sortedBills = expandedBills.sort((a, b) => {
      const aDueDate = createDate(a.dueDate).getTime();
      const bDueDate = createDate(b.dueDate).getTime();
      return aDueDate - bDueDate;
    });

    const payPeriodLength = getPayPeriodLength();

    // Grace period beyond allowable late days (5 extra days)
    const GRACE_PERIOD = 5;

    const findBestAllocationSlot = (
      bill: Bill & { baseId?: string },
      allocations: Allocation[],
      requireFunds: boolean = true
    ): { index: number; score: number; isCriticallyLate: boolean; isUnderfunded: boolean } | null => {
      let bestSlot: { index: number; score: number; isCriticallyLate: boolean; isUnderfunded: boolean } | null = null;
      const billDueDate = createDate(bill.dueDate);
      const allowableLateDay = bill.allowableLateDay || 0;
      const maxLateDays = allowableLateDay + GRACE_PERIOD; // Allow up to allowable + 5 days

      allocations.forEach((alloc, index) => {
        const daysDiff = getDaysBetween(billDueDate, alloc.payDate);
        const availableFunds = alloc.paycheckAmount - alloc.usedFunds;
        const hasEnoughFunds = bill.paymentAmount <= availableFunds;

        // Check timing constraints
        const isNotTooEarly = daysDiff >= -payPeriodLength;
        const isWithinAllowableLate = daysDiff <= allowableLateDay;
        const isWithinGracePeriod = daysDiff > allowableLateDay && daysDiff <= maxLateDays;
        const isNotTooLate = daysDiff <= maxLateDays;

        // Determine if we should consider this slot
        const meetsTimingRequirements = isNotTooEarly && isNotTooLate;
        const meetsFundRequirements = !requireFunds || hasEnoughFunds;

        if (meetsTimingRequirements && meetsFundRequirements) {
          const fundsCushion = hasEnoughFunds ? (availableFunds - bill.paymentAmount) : -1000;
          const timeScore = maxLateDays - Math.abs(daysDiff);
          const isBeforeDue = alloc.payDate <= billDueDate ? 50 : 0;
          // Prioritize on-time payments, then allowable late, then grace period
          const latenessPenalty = isWithinGracePeriod ? -500 : 0;

          // Prioritize paying closer to due date
          const proximityScore = 100 - Math.abs(daysDiff);
          const score =
            fundsCushion + timeScore * 50 + isBeforeDue + proximityScore + latenessPenalty;

          if (!bestSlot || score > bestSlot.score) {
            bestSlot = {
              index,
              score,
              isCriticallyLate: isWithinGracePeriod,
              isUnderfunded: !hasEnoughFunds
            };
          }
        }
      });

      return bestSlot;
    };

    // Allocate bills - ALWAYS assign every bill to a paycheck
    sortedBills.forEach((bill) => {
      const billDueDate = createDate(bill.dueDate);
      let bestSlot: { index: number; score: number; isCriticallyLate: boolean; isUnderfunded: boolean } | null = null;

      // Check if user manually assigned this bill to a specific paycheck
      if (bill.instanceId && billAssignments[bill.instanceId]) {
        const assignedPaycheckDate = billAssignments[bill.instanceId];
        const assignedIndex = allocations.findIndex(alloc => {
          const allocDateStr = alloc.payDate.toISOString().split('T')[0];
          return allocDateStr === assignedPaycheckDate;
        });

        if (assignedIndex >= 0) {
          const alloc = allocations[assignedIndex];
          const daysDiff = getDaysBetween(billDueDate, alloc.payDate);
          const allowableLateDay = bill.allowableLateDay || 0;
          const availableFunds = alloc.paycheckAmount - alloc.usedFunds;
          const hasEnoughFunds = bill.paymentAmount <= availableFunds;

          bestSlot = {
            index: assignedIndex,
            score: 100,
            isCriticallyLate: daysDiff > allowableLateDay,
            isUnderfunded: !hasEnoughFunds
          };
        }
      }

      // If no manual assignment, use automatic allocation
      if (!bestSlot) {
        // First try: Find slot with available funds
        bestSlot = findBestAllocationSlot(bill, allocations, true);

        // Second try: If no funded slot, find any slot (will be marked underfunded)
        if (!bestSlot) {
          bestSlot = findBestAllocationSlot(bill, allocations, false);
        }

        // Last resort: Assign to the closest paycheck after due date
        if (!bestSlot) {
          const allowableLateDay = bill.allowableLateDay || 0;

          // Find the closest paycheck that's not too early
          let closestIndex = -1;
          let closestDiff = Infinity;

          allocations.forEach((alloc, index) => {
            const daysDiff = getDaysBetween(billDueDate, alloc.payDate);
            // Find any paycheck that's after the due date (or close to it)
            if (daysDiff >= -payPeriodLength) {
              const absDiff = Math.abs(daysDiff);
              if (absDiff < closestDiff) {
                closestDiff = absDiff;
                closestIndex = index;
              }
            }
          });

          if (closestIndex >= 0) {
            const daysDiff = getDaysBetween(billDueDate, allocations[closestIndex].payDate);
            bestSlot = {
              index: closestIndex,
              score: 0,
              isCriticallyLate: daysDiff > allowableLateDay,
              isUnderfunded: true
            };
          }
        }
      }

      if (bestSlot) {
        const alloc = allocations[bestSlot.index];
        const daysDiff = getDaysBetween(billDueDate, alloc.payDate);
        const isLate = daysDiff > 0;
        const allowableLateDay = bill.allowableLateDay || 0;
        const availableFunds = alloc.paycheckAmount - alloc.usedFunds;
        const isUnderfunded = bill.paymentAmount > availableFunds;

        alloc.bills.push({
          ...bill,
          isLate,
          isCriticallyLate: daysDiff > allowableLateDay,
          isUnderfunded,
          daysLate: isLate ? daysDiff : 0,
          instanceId: bill.instanceId,
        });

        // Only count towards used funds if there are funds available
        if (!isUnderfunded) {
          alloc.usedFunds += bill.paymentAmount;
        }
      }
    });

    // Only return the requested number of pay periods
    setSchedule(allocations.slice(0, payDatesWithSources.length));
  }, [bills, payDates, payDatesWithSources, income.miscPercent, billAssignments]);

  // Generate suggestions from the schedule

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait" });

    // Calculate some statistics
    const totalBillsAmount = bills.reduce(
      (sum, bill) => sum + bill.paymentAmount,
      0
    );
    const totalSavings = savings.total;

    const averageUsagePercentage = schedule.length > 0 ?
      schedule.reduce(
        (sum, alloc) => sum + (alloc.usedFunds / alloc.paycheckAmount) * 100,
        0
      ) / schedule.length : 0;

    // Calculate savings progress for PDF
    const totalSavingsTarget = schedule.reduce((sum, alloc) => {
      const grossPaycheck = alloc.paycheckAmount / (1 - income.miscPercent / 100);
      return sum + (grossPaycheck * (income.miscPercent / 100));
    }, 0);

    const depositedSavings = paycheckSavings
      .filter(s => s.isDeposited)
      .reduce((sum, s) => sum + s.amount, 0);

    const savingsProgressPercent = totalSavingsTarget > 0
      ? (depositedSavings / totalSavingsTarget) * 100
      : 0;

    // Professional Dashboard Page with Visual Summary
    doc.setFontSize(24);
    doc.setTextColor(23, 23, 23);
    doc.text("Budget Planner Report", 15, 15);

    // Orange accent line
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(2);
    doc.line(15, 20, 75, 20);

    // Date generated
    doc.setFontSize(10);
    doc.setTextColor(115, 115, 115);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 28);

    // =============== VISUAL DASHBOARD SECTION ===============
    const dashboardY = 38;

    // Box 1: Income (White with grey border)
    doc.setDrawColor(115, 115, 115);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, dashboardY, 55, 35, 3, 3, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(115, 115, 115);
    doc.text("MONTHLY INCOME", 20, dashboardY + 10);
    doc.setFontSize(16);
    doc.setTextColor(23, 23, 23);
    doc.setFont("helvetica", "bold");
    doc.text(`$${monthlyIncome.toFixed(0)}`, 20, dashboardY + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(115, 115, 115);
    doc.text(`$${yearlyIncome.toFixed(0)}/year`, 20, dashboardY + 30);

    // Box 2: Bills (Dark grey like header)
    doc.setFillColor(23, 23, 23);
    doc.roundedRect(77, dashboardY, 55, 35, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("MONTHLY BILLS", 82, dashboardY + 10);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`$${totalBillsAmount.toFixed(0)}`, 82, dashboardY + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${bills.length} bills total`, 82, dashboardY + 30);

    // Box 3: Savings Target (Orange accent)
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(139, dashboardY, 55, 35, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setTextColor(23, 23, 23);
    doc.text("SAVINGS TARGET", 144, dashboardY + 10);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`$${totalSavingsTarget.toFixed(0)}`, 144, dashboardY + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${income.miscPercent}% of income`, 144, dashboardY + 30);

    // =============== PROGRESS BARS SECTION ===============
    const progressY = dashboardY + 45;

    // Budget Usage Progress Bar
    doc.setFontSize(10);
    doc.setTextColor(23, 23, 23);
    doc.setFont("helvetica", "bold");
    doc.text("Budget Usage", 15, progressY);
    doc.setFont("helvetica", "normal");
    doc.text(`${averageUsagePercentage.toFixed(0)}%`, 180, progressY);

    // Background bar
    doc.setFillColor(229, 229, 229);
    doc.roundedRect(15, progressY + 3, 180, 8, 2, 2, 'F');

    // Progress bar (dark grey)
    doc.setFillColor(64, 64, 64);
    const usageWidth = Math.min(averageUsagePercentage, 100) * 1.8;
    doc.roundedRect(15, progressY + 3, usageWidth, 8, 2, 2, 'F');

    // Savings Progress Bar
    doc.setFont("helvetica", "bold");
    doc.text("Savings Progress", 15, progressY + 20);
    doc.setFont("helvetica", "normal");
    doc.text(`${savingsProgressPercent.toFixed(0)}% deposited`, 155, progressY + 20);

    // Background bar
    doc.setFillColor(229, 229, 229);
    doc.roundedRect(15, progressY + 23, 180, 8, 2, 2, 'F');

    // Progress bar (orange accent)
    doc.setFillColor(245, 158, 11);
    const savingsWidth = Math.min(savingsProgressPercent, 100) * 1.8;
    if (savingsWidth > 0) {
      doc.roundedRect(15, progressY + 23, savingsWidth, 8, 2, 2, 'F');
    }

    // =============== SUMMARY STATS ===============
    const statsY = progressY + 42;

    doc.setFillColor(250, 250, 250);
    doc.rect(15, statsY, 180, 25, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, statsY, 180, 25, 'S');

    // Stats grid
    doc.setFontSize(8);
    doc.setTextColor(115, 115, 115);
    doc.text("AVG. PAYCHECK", 25, statsY + 8);
    doc.text("BILLS PER CHECK", 75, statsY + 8);
    doc.text("REMAINING/CHECK", 130, statsY + 8);

    const avgPaycheck = schedule.length > 0
      ? schedule.reduce((sum, a) => sum + a.paycheckAmount, 0) / schedule.length
      : 0;
    const avgBillsPerCheck = schedule.length > 0
      ? schedule.reduce((sum, a) => sum + a.usedFunds, 0) / schedule.length
      : 0;
    const avgRemaining = avgPaycheck - avgBillsPerCheck;

    doc.setFontSize(11);
    doc.setTextColor(23, 23, 23);
    doc.setFont("helvetica", "bold");
    doc.text(`$${avgPaycheck.toFixed(0)}`, 25, statsY + 18);
    doc.text(`$${avgBillsPerCheck.toFixed(0)}`, 75, statsY + 18);
    doc.text(`$${avgRemaining.toFixed(0)}`, 130, statsY + 18);
    doc.setFont("helvetica", "normal");

    // =============== BILLS TABLE ===============
    const tableY = statsY + 35;
    doc.setFontSize(14);
    doc.setTextColor(23, 23, 23);
    doc.text("Bills Overview", 15, tableY);

    const billsSummaryData = bills.map((b) => {
      const isLate = schedule.some((alloc) =>
        alloc.bills.some((bill) => bill.name === b.name && bill.isLate)
      );

      return [
        b.name,
        `$${b.paymentAmount.toFixed(2)}`,
        `${b.apr.toFixed(2)}%`,
        new Date(b.dueDate).toLocaleDateString(),
        b.billType.charAt(0).toUpperCase() + b.billType.slice(1),
        isLate ? "Late" : "On Time",
      ];
    });

    autoTable(doc, {
      startY: tableY + 5,
      head: [["Bill Name", "Amount", "APR", "Due Date", "Type", "Status"]],
      body: billsSummaryData,
      theme: "plain",
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [229, 229, 229],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [23, 23, 23],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        5: { cellWidth: 22, halign: "center" },
      },
    });

    // Detailed Payment Schedule
    doc.addPage("portrait");
    doc.setFontSize(18);
    doc.setTextColor(23, 23, 23);
    doc.text("Payment Schedule", 15, 15);

    // Orange accent line
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(2);
    doc.line(15, 20, 55, 20);

    let scheduleY = 30;
    schedule.forEach((alloc) => {
      if (scheduleY > 250) {
        doc.addPage();
        scheduleY = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(23, 23, 23);
      doc.text(
        `Paycheck: ${alloc.payDate.toLocaleDateString()}`,
        15,
        scheduleY
      );
      scheduleY += 6;

      doc.setFontSize(9);
      doc.setTextColor(115, 115, 115);
      const usagePercent = (
        (alloc.usedFunds / alloc.paycheckAmount) *
        100
      ).toFixed(1);
      doc.text(
        `Amount: $${alloc.paycheckAmount.toFixed(
          2
        )} | Used: $${alloc.usedFunds.toFixed(
          2
        )} (${usagePercent}%) | Available: $${(
          alloc.paycheckAmount - alloc.usedFunds
        ).toFixed(2)}`,
        15,
        scheduleY + 4
      );
      scheduleY += 10;

      // Get savings info for this paycheck
      const paycheckDateStr = alloc.payDate.toISOString().split('T')[0];
      const grossPaycheck = alloc.paycheckAmount / (1 - income.miscPercent / 100);
      const customSavings = paycheckSavings.find(s => s.paycheckDate === paycheckDateStr);
      const savingsAmount = customSavings ? customSavings.amount : getDefaultSavingsForPaycheck(grossPaycheck);
      const savingsDeposited = customSavings?.isDeposited || false;

      // Build table rows - savings first, then bills
      const tableRows: (string | { content: string; styles?: Record<string, unknown> })[][] = [];

      // Add savings row (highlighted in green)
      tableRows.push([
        { content: "💰 Savings Deposit", styles: { fontStyle: 'bold', textColor: [22, 101, 52] } },
        { content: `$${savingsAmount.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: [22, 101, 52] } },
        { content: "—", styles: { textColor: [115, 115, 115] } },
        { content: "Transfer", styles: { textColor: [22, 101, 52] } },
        { content: savingsDeposited ? "✓ Deposited" : "Pending", styles: { fontStyle: 'bold', textColor: savingsDeposited ? [22, 101, 52] : [202, 138, 4] } },
      ]);

      // Add bill rows
      alloc.bills.forEach((b) => {
        const billDueDate = new Date(b.dueDate);
        const daysLate = Math.ceil(
          (new Date(alloc.payDate).getTime() - billDueDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        tableRows.push([
          b.name,
          `$${b.paymentAmount.toFixed(2)}`,
          `${b.apr.toFixed(2)}%`,
          b.dueDate,
          b.isLate ? `Late (${daysLate} days)` : "On Time",
        ]);
      });

      autoTable(doc, {
        startY: scheduleY,
        head: [["Item", "Amount", "APR", "Due/Type", "Status"]],
        body: tableRows,
        theme: "plain",
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: [229, 229, 229],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [64, 64, 64],
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        didParseCell: function(data) {
          // Highlight savings row with green background
          if (data.row.index === 0 && data.section === 'body') {
            data.cell.styles.fillColor = [220, 252, 231]; // green-100
          }
        },
      });
      scheduleY = doc.lastAutoTable.finalY + 12;
    });

    doc.save("budget_planner_report.pdf");
  };

  const [showInstructions, setShowInstructions] = useState(false);
  const [mobileTab, setMobileTab] = useState<'schedule' | 'budget'>('schedule');

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Professional Header */}
      <header className="bg-neutral-900 border-b-4 border-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 sm:py-8">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
              {/* Left Side - Title Section */}
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                  <div className="bg-primary-500 p-2 rounded">
                    <Wallet className="text-neutral-900 w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    BUDGET PLANNER
                  </h1>
                </div>
                <p className="text-neutral-400 text-sm">
                  Professional Financial Management
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-4">
                  <span className="bg-neutral-800 text-primary-500 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wide border border-neutral-700">
                    Free Tool
                  </span>
                  <button
                    onClick={() => setShowInstructions(true)}
                    className="bg-neutral-800 text-neutral-300 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wide border border-neutral-700 hover:bg-neutral-700 hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    How to Use
                  </button>
                  {user && (
                    <div className="flex items-center gap-2">
                      <span className="bg-neutral-800 text-neutral-300 px-3 py-1 rounded text-xs font-semibold border border-neutral-700 inline-flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {user.name}
                      </span>
                      <button
                        onClick={logout}
                        className="bg-neutral-800 text-red-400 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wide border border-neutral-700 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 transition-colors inline-flex items-center gap-1"
                      >
                        <LogOut className="w-3 h-3" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Savings Section */}
              <div className="bg-neutral-800 rounded-lg p-5 w-full lg:w-auto lg:min-w-[320px] border border-neutral-700">
                {/* Total Savings */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-neutral-700">
                  <div className="bg-primary-500 p-2 rounded">
                    <TrendingUp className="text-neutral-900 w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-neutral-400 text-xs font-medium uppercase tracking-wide">
                      Projected Savings
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(savings.total)}
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center">
                    <div className="text-neutral-500 text-xs font-medium uppercase tracking-wide mb-1">Monthly</div>
                    <div className="text-white font-semibold text-xs sm:text-sm">
                      {formatCurrency(savings.monthly)}
                    </div>
                  </div>

                  <div className="text-center border-x border-neutral-700 px-1 sm:px-0">
                    <div className="text-neutral-500 text-xs font-medium uppercase tracking-wide mb-1">Rate</div>
                    <div className="text-white font-semibold text-xs sm:text-sm">
                      {savings?.percent || 0}%
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-neutral-500 text-xs font-medium uppercase tracking-wide mb-1">Periods</div>
                    <div className="text-white font-semibold text-xs sm:text-sm">
                      {schedule?.length || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-elevated">
            <div className="flex justify-between items-center p-6 border-b border-neutral-200 bg-neutral-900">
              <h2 className="text-lg font-bold text-white uppercase tracking-wide">How to Use Budget Planner</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <span className="bg-primary-500 text-neutral-900 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">1</span>
                  Income Setup
                </h3>
                <p className="text-neutral-600 ml-8">Enter your income, choose pay frequency, the last time you were paid, amount you want to save from each check, and how many months you want to project.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <span className="bg-primary-500 text-neutral-900 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">2</span>
                  Add Bills
                </h3>
                <p className="text-neutral-600 ml-8">Input your regular bills with their amounts and due dates.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <span className="bg-primary-500 text-neutral-900 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">3</span>
                  Payment Schedule
                </h3>
                <p className="text-neutral-600 ml-8">View your payment schedule. Each paycheck shows your savings deposit amount and bills due.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <span className="bg-primary-500 text-neutral-900 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">4</span>
                  Track Progress
                </h3>
                <p className="text-neutral-600 ml-8">Mark bills and savings as paid/deposited. Your data is automatically saved to your account.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <span className="bg-primary-500 text-neutral-900 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">5</span>
                  Download PDF
                </h3>
                <p className="text-neutral-600 ml-8">Download a PDF report showing your schedule with savings and bills for each paycheck.</p>
              </div>
            </div>
            <div className="p-4 bg-neutral-50 border-t border-neutral-200">
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full bg-neutral-900 text-white py-2 px-4 rounded font-semibold hover:bg-neutral-800 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-end">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center px-4 py-2 bg-primary-500 text-neutral-900 rounded font-semibold hover:bg-primary-400 transition-colors text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex">
            <button
              onClick={() => setMobileTab('schedule')}
              className={`flex-1 py-3 px-4 text-sm font-semibold uppercase tracking-wide border-b-2 transition-colors ${
                mobileTab === 'schedule'
                  ? 'border-primary-500 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Calendar className="w-4 h-4 inline-block mr-2" />
              Schedule
            </button>
            <button
              onClick={() => setMobileTab('budget')}
              className={`flex-1 py-3 px-4 text-sm font-semibold uppercase tracking-wide border-b-2 transition-colors ${
                mobileTab === 'budget'
                  ? 'border-primary-500 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <DollarSign className="w-4 h-4 inline-block mr-2" />
              Income & Bills
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar - Hidden on mobile when viewing schedule */}
          <aside className={`lg:w-1/3 xl:w-1/4 space-y-6 ${mobileTab === 'schedule' ? 'hidden lg:block' : ''}`}>
            <IncomeForm
              income={income}
              setIncomeAction={setIncome}
              onSavingsCalculated={handleSavingsCalculated}
              onSaveIncome={user ? handleSaveIncome : undefined}
              isSaving={isSavingIncome}
            />
            <BillForm
              setBillsAction={setBills}
              onAddBill={user ? handleAddBill : undefined}
            />
          </aside>

          {/* Main Content Area - Hidden on mobile when viewing budget */}
          <section className={`lg:flex-1 space-y-6 ${mobileTab === 'budget' ? 'hidden lg:block' : ''}`}>
            <BillList bills={bills} setBillsAction={setBills} />
            <PaymentSchedule
              schedule={schedule}
              setScheduleAction={setSchedule}
              savings={savings}
              oneTimeBills={oneTimeBills}
              onAddOneTimeBill={handleAddOneTimeBill}
              onToggleOneTimeBillPaid={handleToggleOneTimeBillPaid}
              onDeleteOneTimeBill={handleDeleteOneTimeBill}
              paycheckSavings={paycheckSavings}
              onUpdatePaycheckSavings={handleUpdatePaycheckSavings}
              onToggleSavingsDeposited={handleToggleSavingsDeposited}
              getDefaultSavingsForPaycheck={getDefaultSavingsForPaycheck}
              billPayments={billPayments}
              onToggleBillPaid={handleToggleBillPaid}
              onAddOneTimeSavings={handleAddOneTimeSavings}
              oneTimeSavingsTotal={oneTimeSavingsTotal}
              billPaycheckAmounts={billPaycheckAmounts}
              onUpdateBillPaycheckAmount={handleUpdateBillPaycheckAmount}
              onBillMoved={saveBillAssignment}
            />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t-4 border-primary-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-neutral-400 text-sm">
            Budget Planner - Free Financial Management Tool
          </div>
        </div>
      </footer>
    </div>
  );
}
