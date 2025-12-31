"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Income, Bill } from "./(components)/types";
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
  PiggyBank
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/globals.css";

interface AllocatedBill extends Bill {
  isLate?: boolean;
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

export default function BudgetPlanner() {
  const [income, setIncome] = useState<Income>({
    amount: 0,
    frequency: "monthly",
    lastPayDate: "",
    miscPercent: 30,
    monthsToShow: 1,
  });

  const [savings, setSavings] = useState({ monthly: 0, total: 0, percent: 0 });
  const [bills, setBills] = useState<Bill[]>([]);
  const [schedule, setSchedule] = useState<Allocation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Calculate Monthly and Yearly Income
  const monthlyIncome = useMemo(() => {
    const { amount, frequency } = income;
    switch (frequency) {
      case "weekly":
        return amount * 4.345;
      case "biweekly":
        return amount * 2;
      case "twicemonthly":
        return amount * 2; // Paid twice per month (e.g., 1st and 15th)
      case "monthly":
      default:
        return amount;
    }
  }, [income]);

  const yearlyIncome = monthlyIncome * 12;

  // Generate Pay Dates
  const payDates = useMemo(() => {
    if (!income.lastPayDate) return [];
    const startDate = new Date(income.lastPayDate);
    const payDatesArray: Date[] = [];
    const monthsToShow = income.monthsToShow || 2;

    switch (income.frequency) {
      case "weekly":
        for (let i = 0; i < Math.round(4.345 * monthsToShow); i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i * 7);
          payDatesArray.push(date);
        }
        break;
      case "biweekly":
        for (let i = 0; i < 2 * monthsToShow; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i * 14);
          payDatesArray.push(date);
        }
        break;
      case "twicemonthly":
        // Generate pay dates on specific days each month (e.g., 1st and 15th)
        const firstPayDay = income.firstPayDay || 1;
        const secondPayDay = income.secondPayDay || 15;
        const [earlierDay, laterDay] = firstPayDay < secondPayDay
          ? [firstPayDay, secondPayDay]
          : [secondPayDay, firstPayDay];

        for (let i = 0; i < monthsToShow; i++) {
          const year = startDate.getFullYear();
          const month = startDate.getMonth() + i;

          // Handle year rollover
          const actualYear = year + Math.floor(month / 12);
          const actualMonth = month % 12;

          // Get the last day of this month to handle edge cases (e.g., day 31 in February)
          const lastDayOfMonth = new Date(actualYear, actualMonth + 1, 0).getDate();

          // First pay date of the month (use min to handle months with fewer days)
          const firstDate = new Date(actualYear, actualMonth, Math.min(earlierDay, lastDayOfMonth));
          // Only add if it's on or after the start date
          if (firstDate >= startDate || i > 0) {
            payDatesArray.push(firstDate);
          }

          // Second pay date of the month
          const secondDate = new Date(actualYear, actualMonth, Math.min(laterDay, lastDayOfMonth));
          if (secondDate >= startDate || i > 0) {
            payDatesArray.push(secondDate);
          }
        }
        // Sort to ensure chronological order and remove duplicates
        payDatesArray.sort((a, b) => a.getTime() - b.getTime());
        break;
      case "monthly":
        for (let i = 0; i < monthsToShow; i++) {
          const date = new Date(startDate);
          date.setMonth(startDate.getMonth() + i);
          payDatesArray.push(date);
        }
        break;
    }
    return payDatesArray;
  }, [income]);

  // Generate the payment schedule based on pay dates and bills
  // Payment Schedule Funtions

  useEffect(() => {
    if (!bills.length || !payDates.length || income.amount <= 0) {
      setSchedule([]);
      return;
    }

    const paycheckAmount = income.amount;
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

    // Calculate extended allocation period
    const allocationPayDates = [...payDates];
    if (payDates.length >= 2) {
      const lastDate = new Date(
        Date.UTC(
          payDates[payDates.length - 1].getFullYear(),
          payDates[payDates.length - 1].getMonth(),
          payDates[payDates.length - 1].getDate()
        )
      );
      const payPeriodDays = getDaysBetween(payDates[0], payDates[1]);

      // Add two extra pay periods for calculation purposes
      for (let i = 0; i < 2; i++) {
        const nextDate = new Date(
          Date.UTC(
            lastDate.getUTCFullYear(),
            lastDate.getUTCMonth(),
            lastDate.getUTCDate() + payPeriodDays
          )
        );
        allocationPayDates.push(nextDate);
        lastDate.setUTCDate(lastDate.getUTCDate() + payPeriodDays);
      }
    }

    // Initialize allocations with all required properties
    const allocations: Allocation[] = allocationPayDates.map((date) => ({
      payDate: date,
      bills: [],
      suggestedChanges: [], // This can be an empty array since we're not using suggestions
      usedFunds: 0,
      paycheckAmount: paycheckAmount * (1 - miscReserveFactor),
    }));

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

    const findBestAllocationSlot = (
      bill: Bill & { baseId?: string },
      allocations: Allocation[]
      //currentDate: Date
    ): { index: number; score: number } | null => {
      let bestSlot: { index: number; score: number } | null = null;
      const billDueDate = createDate(bill.dueDate);
      const allowableLateDay = bill.allowableLateDay || 0;

      allocations.forEach((alloc, index) => {
        const daysDiff = getDaysBetween(billDueDate, alloc.payDate);
        const availableFunds = alloc.paycheckAmount - alloc.usedFunds;

        // Only allow allocation if:
        // 1. Not paying more than one pay period in advance
        // 2. Within allowable late days if paying late
        // 3. Has enough funds
        const isNotTooEarly = daysDiff >= -payPeriodLength;
        const isNotTooLate = daysDiff <= allowableLateDay;
        const hasEnoughFunds = bill.paymentAmount <= availableFunds;

        if (isNotTooEarly && isNotTooLate && hasEnoughFunds) {
          const fundsCushion = availableFunds - bill.paymentAmount;
          const timeScore = allowableLateDay - Math.abs(daysDiff);
          const isBeforeDue = alloc.payDate <= billDueDate ? 50 : 0;

          // Prioritize paying closer to due date
          const proximityScore = 100 - Math.abs(daysDiff);
          const score =
            fundsCushion + timeScore * 50 + isBeforeDue + proximityScore;

          if (!bestSlot || score > bestSlot.score) {
            bestSlot = { index, score };
          }
        }
      });

      return bestSlot;
    };

    // Allocate bills
    sortedBills.forEach((bill) => {
      const billDueDate = createDate(bill.dueDate);
      const bestSlot = findBestAllocationSlot(bill, allocations);

      if (bestSlot) {
        const alloc = allocations[bestSlot.index];
        const daysDiff = getDaysBetween(billDueDate, alloc.payDate);
        const isLate = daysDiff > 0;

        alloc.bills.push({
          ...bill,
          isLate,
          instanceId: bill.instanceId,
        });

        alloc.usedFunds += bill.paymentAmount;
      } else {
        // If no optimal slot found, try to find the closest viable pay period
        const fallbackSlots = allocations
          .filter((alloc) => {
            const daysDiff = getDaysBetween(billDueDate, alloc.payDate);
            return (
              alloc.paycheckAmount - alloc.usedFunds >= bill.paymentAmount &&
              daysDiff >= -payPeriodLength &&
              daysDiff <= (bill.allowableLateDay || 0)
            );
          })
          .sort((a, b) => {
            const aDiff = Math.abs(getDaysBetween(billDueDate, a.payDate));
            const bDiff = Math.abs(getDaysBetween(billDueDate, b.payDate));
            return aDiff - bDiff;
          });

        const fallbackSlot = fallbackSlots[0];

        if (fallbackSlot) {
          fallbackSlot.bills.push({
            ...bill,
            isLate: fallbackSlot.payDate > billDueDate,
            instanceId: bill.instanceId,
          });

          fallbackSlot.usedFunds += bill.paymentAmount;
        }
      }
    });

    // Only return the requested number of pay periods
    setSchedule(allocations.slice(0, payDates.length));
  }, [bills, payDates, income]);

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
          setIncome(importedData.income);
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
