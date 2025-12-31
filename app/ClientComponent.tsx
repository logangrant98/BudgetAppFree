"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Income, IncomeSource, Bill, OneTimeBill, AllocatedBill } from "./(components)/types";
import IncomeForm from "./(components)/IncomeForm";
import BillForm from "./(components)/BillForm";
import BillList from "./(components)/BillList/BillList";
import PaymentSchedule from "./(components)/PaymentSchedule";
import {
  FileDown,
  FileUp,
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, logout } = useAuth();

  // Fetch one-time bills on mount when user is logged in
  useEffect(() => {
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
    fetchOneTimeBills();
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

      // First try: Find slot with available funds
      let bestSlot = findBestAllocationSlot(bill, allocations, true);

      // Second try: If no funded slot, find any slot (will be marked underfunded)
      if (!bestSlot) {
        bestSlot = findBestAllocationSlot(bill, allocations, false);
      }

      // Last resort: Assign to the closest paycheck after due date
      if (!bestSlot) {
        const allowableLateDay = bill.allowableLateDay || 0;
        const maxLateDays = allowableLateDay + GRACE_PERIOD;

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
  }, [bills, payDates, payDatesWithSources, income.miscPercent]);

  // Generate suggestions from the schedule

  // Export Data to JSON
  const handleExport = () => {
    const data = { income, bills };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "budget_data.json";
    link.click();
  };

  // Import Data from JSON
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const importedData = JSON.parse(event.target.result as string);
        if (importedData.income && importedData.bills) {
          // Check if this is old format (has amount field instead of sources array)
          if ('amount' in importedData.income && !importedData.income.sources) {
            // Convert old format to new format
            const oldIncome = importedData.income;
            const convertedIncome: Income = {
              sources: [{
                id: `income-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: "Primary Income",
                amount: oldIncome.amount || 0,
                frequency: oldIncome.frequency || "monthly",
                lastPayDate: oldIncome.lastPayDate || "",
                firstPayDay: oldIncome.firstPayDay,
                secondPayDay: oldIncome.secondPayDay,
              }],
              miscPercent: oldIncome.miscPercent || 30,
              monthsToShow: oldIncome.monthsToShow || 1,
            };
            setIncome(convertedIncome);
          } else {
            setIncome(importedData.income);
          }
          setBills(importedData.bills);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait" });

    // Calculate some statistics
    const totalBillsAmount = bills.reduce(
      (sum, bill) => sum + bill.paymentAmount,
      0
    );
    const totalSavings = savings.total;

    const averageUsagePercentage =
      schedule.reduce(
        (sum, alloc) => sum + (alloc.usedFunds / alloc.paycheckAmount) * 100,
        0
      ) / schedule.length;

    // Professional Dashboard Page
    doc.setFontSize(24);
    doc.setTextColor(23, 23, 23); // Near black
    doc.text("Budget Planner Report", 15, 15);

    // Yellow accent line
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(2);
    doc.line(15, 20, 60, 20);

    // Income Summary Section
    doc.setFontSize(14);
    doc.setTextColor(23, 23, 23);
    doc.text("Financial Summary", 15, 32);

    const metrics = [
      { label: "Monthly Income", value: `$${monthlyIncome.toFixed(2)}` },
      { label: "Yearly Income", value: `$${yearlyIncome.toFixed(2)}` },
      { label: "Total Bills", value: `$${totalBillsAmount.toFixed(2)}` },
      { label: "Avg Usage", value: `${averageUsagePercentage.toFixed(1)}%` },
      { label: "Projected Savings", value: `$${totalSavings.toFixed(2)}` },
      { label: "Savings Rate", value: `${income.miscPercent}%` },
    ];

    let metricX = 15;
    let metricY = 42;
    metrics.forEach((metric, index) => {
      if (index % 3 === 0 && index !== 0) {
        metricX = 15;
        metricY += 18;
      }
      doc.setFontSize(10);
      doc.setTextColor(115, 115, 115); // Gray
      doc.text(metric.label, metricX, metricY);
      doc.setFontSize(12);
      doc.setTextColor(23, 23, 23);
      doc.text(metric.value, metricX, metricY + 6);
      metricX += 60;
    });

    // Bills Summary Table
    doc.setFontSize(14);
    doc.setTextColor(23, 23, 23);
    doc.text("Bills Overview", 15, metricY + 22);

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
        {
          content: isLate ? "Late" : "On Time",
          styles: {
            textColor: (isLate ? [180, 83, 9] : [22, 163, 74]) as [
              number,
              number,
              number
            ],
          },
        },
      ];
    });

    autoTable(doc, {
      startY: metricY + 27,
      head: [["Bill Name", "Amount", "APR", "Due Date", "Type"]],
      body: billsSummaryData,
      theme: "plain",
      styles: {
        fontSize: 10,
        cellPadding: 4,
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
        5: { cellWidth: 25, halign: "center" },
      },
    });

    // Detailed Payment Schedule
    doc.addPage("portrait");
    doc.setFontSize(18);
    doc.setTextColor(23, 23, 23);
    doc.text("Payment Schedule", 15, 15);

    // Yellow accent line
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

      if (alloc.bills.length > 0) {
        autoTable(doc, {
          startY: scheduleY,
          head: [["Bill Name", "Payment", "APR", "Due Date", "Status"]],
          body: alloc.bills.map((b) => {
            const billDueDate = new Date(b.dueDate);
            const daysLate = Math.ceil(
              (new Date(alloc.payDate).getTime() - billDueDate.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            return [
              b.name,
              `$${b.paymentAmount.toFixed(2)}`,
              `${b.apr.toFixed(2)}%`,
              b.dueDate,
              b.isLate ? `Late (${daysLate} days)` : "On Time",
            ];
          }),
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
        });
        scheduleY = doc.lastAutoTable.finalY + 12;
      } else {
        doc.text("No bills assigned to this paycheck.", 15, scheduleY);
        scheduleY += 15;
      }
    });

    doc.save("budget_planner_report.pdf");
  };

  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Professional Header */}
      <header className="bg-neutral-900 border-b-4 border-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 sm:py-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Left Side - Title Section */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary-500 p-2 rounded">
                    <Wallet className="text-neutral-900 w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    BUDGET PLANNER
                  </h1>
                </div>
                <p className="text-neutral-400 text-sm ml-12">
                  Professional Financial Management
                </p>
                <div className="flex flex-wrap gap-2 mt-4 ml-12">
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-neutral-500 text-xs font-medium uppercase tracking-wide mb-1">Monthly</div>
                    <div className="text-white font-semibold text-sm">
                      {formatCurrency(savings.monthly)}
                    </div>
                  </div>

                  <div className="text-center border-x border-neutral-700">
                    <div className="text-neutral-500 text-xs font-medium uppercase tracking-wide mb-1">Rate</div>
                    <div className="text-white font-semibold text-sm">
                      {savings?.percent || 0}%
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-neutral-500 text-xs font-medium uppercase tracking-wide mb-1">Periods</div>
                    <div className="text-white font-semibold text-sm">
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
                  <span className="bg-primary-500 text-neutral-900 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">0</span>
                  Import Previous Data
                </h3>
                <p className="text-neutral-600 ml-8">If you have previous data, import the JSON file to restore your budget.</p>
              </div>

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
                <p className="text-neutral-600 ml-8">View and adjust your monthly payment schedule to stay on track.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <span className="bg-primary-500 text-neutral-900 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">4</span>
                  Export Data
                </h3>
                <p className="text-neutral-600 ml-8">Save your data by exporting the JSON file to your local device.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                  <span className="bg-primary-500 text-neutral-900 w-6 h-6 rounded flex items-center justify-center text-sm font-bold">5</span>
                  Download PDF
                </h3>
                <p className="text-neutral-600 ml-8">For an easier way to view your schedule, download the PDF printout.</p>
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
          <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleExport}
                className="flex items-center px-4 py-2 bg-neutral-900 text-white rounded font-medium hover:bg-neutral-800 transition-colors text-sm"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export Data
              </button>

              <button
                onClick={handleImportClick}
                className="flex items-center px-4 py-2 bg-white text-neutral-700 rounded font-medium border border-neutral-300 hover:bg-neutral-50 transition-colors text-sm"
              >
                <FileUp className="w-4 h-4 mr-2" />
                Import Data
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-1/3 xl:w-1/4 space-y-6">
            <IncomeForm
              income={income}
              setIncomeAction={setIncome}
              onSavingsCalculated={handleSavingsCalculated}
            />
            <BillForm setBillsAction={setBills} />
          </aside>

          {/* Main Content Area */}
          <section className="lg:flex-1 space-y-6">
            <BillList bills={bills} setBillsAction={setBills} />
            <PaymentSchedule
              schedule={schedule}
              setScheduleAction={setSchedule}
              savings={savings}
              oneTimeBills={oneTimeBills}
              onAddOneTimeBill={handleAddOneTimeBill}
              onToggleOneTimeBillPaid={handleToggleOneTimeBillPaid}
              onDeleteOneTimeBill={handleDeleteOneTimeBill}
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
