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
  X
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

    // Modern Dashboard Page
    doc.setFontSize(24);
    doc.setTextColor(41, 128, 185); // Bright blue header
    doc.text("Budget Planner Dashboard", 15, 15);

    // Income Summary Section
    doc.setFontSize(16);
    doc.setTextColor(52, 152, 219);
    doc.text("Income Summary", 15, 25);

    const metrics = [
      { label: "Monthly Income", value: `$${monthlyIncome.toFixed(2)}` },
      { label: "Yearly Income", value: `$${yearlyIncome.toFixed(2)}` },
      { label: "Total Bills", value: `$${totalBillsAmount.toFixed(2)}` },
      { label: "Avg Usage", value: `${averageUsagePercentage.toFixed(1)}%` },
      { label: "Projected Savings", value: `$${totalSavings.toFixed(2)}` },
      { label: "Savings Rate", value: `${income.miscPercent}%` },
    ];

    let metricX = 15;
    let metricY = 35;
    metrics.forEach((metric, index) => {
      if (index % 3 === 0 && index !== 0) {
        metricX = 15;
        metricY += 15;
      }
      doc.setFontSize(12);
      doc.setTextColor(33, 33, 33); // Text color
      doc.text(metric.label, metricX, metricY);
      doc.setTextColor(41, 128, 185); // Bright blue for values
      doc.text(metric.value, metricX, metricY + 6);
      metricX += 60;
    });

    // Bills Summary Table
    doc.setFontSize(16);
    doc.setTextColor(52, 152, 219);
    doc.text("Bills Overview", 15, metricY + 15);

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
            textColor: (isLate ? [255, 69, 58] : [34, 197, 94]) as [
              number,
              number,
              number
            ],
          },
        },
      ];
    });

    autoTable(doc, {
      startY: metricY + 20,
      head: [["Bill Name", "Amount", "APR", "Due Date", "Type"]],
      body: billsSummaryData,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [240, 248, 255], // Light blue row background
      },
      columnStyles: {
        5: { cellWidth: 30, halign: "center" }, // Center-align the Status column
      },
    });

    // // Key Recommendations
    // doc.addPage("");
    // doc.setFontSize(18);
    // doc.setTextColor(41, 128, 185);
    // doc.text("Key Recommendations", 15, 15);

    // const allSuggestions = schedule.flatMap((alloc) =>
    //   alloc.suggestedChanges.map((s) => ({
    //     ...s,
    //     payDate: alloc.payDate,
    //   }))
    // );

    // if (allSuggestions.length > 0) {
    //   autoTable(doc, {
    //     startY: 20,
    //     head: [["Bill", "Current Due Date", "Suggested Date"]],
    //     body: allSuggestions.map((s) => [
    //       s.billName,
    //       new Date(s.originalDate).toLocaleDateString(),
    //       new Date(s.suggestedDate).toLocaleDateString(),
    //     ]),
    //     theme: "grid",
    //     styles: {
    //       fontSize: 10,
    //       cellPadding: 3,
    //     },
    //     headStyles: {
    //       fillColor: [41, 128, 185],
    //       textColor: 255,
    //       fontStyle: "bold",
    //     },
    //     alternateRowStyles: {
    //       fillColor: [240, 248, 255],
    //     },
    //   });
    // } else {
    //   doc.setFontSize(12);
    //   doc.setTextColor(100, 116, 139);
    //   doc.text("No scheduling adjustments recommended.", 15, 25);
    // }

    // Detailed Payment Schedule
    doc.addPage("portrait");
    doc.setFontSize(18);
    doc.setTextColor(41, 128, 185);
    doc.text("Detailed Payment Schedule", 15, 15);

    let scheduleY = 25;
    schedule.forEach((alloc) => {
      if (scheduleY > 250) {
        doc.addPage();
        scheduleY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(52, 152, 219);
      doc.text(
        `Paycheck: ${alloc.payDate.toLocaleDateString()}`,
        15,
        scheduleY
      );
      scheduleY += 6;

      doc.setFontSize(10);
      doc.setTextColor(33, 33, 33);
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
        scheduleY + 5
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
          theme: "grid",
          styles: {
            fontSize: 10,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [52, 152, 219],
            textColor: 255,
          },
          alternateRowStyles: {
            fillColor: [240, 248, 255],
          },
        });
        scheduleY = doc.lastAutoTable.finalY + 10;
      } else {
        doc.text("No bills assigned to this paycheck.", 15, scheduleY);
        scheduleY += 15;
      }
    });

    doc.save("budget_planner_report.pdf");
  };

  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 sm:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-center gap-6 sm:gap-8">
              {/* Left Side - Title Section */}
              <div className="text-center sm:text-left">
        <div className="flex justify-center sm:justify-start mb-4">
          <Wallet className="text-white w-10 h-10 sm:w-12 sm:h-12" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Budget Planner
        </h1>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <span className="bg-white/20 text-white px-4 py-1 rounded-full text-sm inline-block">
            ✨ Free to use!
          </span>
          <button
            onClick={() => setShowInstructions(true)}
            className="bg-white/20 text-white px-4 py-1 rounded-full text-sm inline-flex items-center hover:bg-white/30 transition-colors"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            Instructions
          </button>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">How to Use Budget Planner</h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">

              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">(If you have previous data: Import the JSON file.)</h3>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">1. Income Setup</h3>
                <p className="text-gray-600">Enter your income, choose pay frequency, the last time you were paid, amount you want to save from each check, and lastly how many months you want to project.</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">2. Add Bills</h3>
                <p className="text-gray-600">Input your regular bills with their amounts and due dates.</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">3. Payment Schedule</h3>
                <p className="text-gray-600">View and adjust your monthly payment schedule to stay on track.</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">4. Export Data</h3>
                <p className="text-gray-600">To save your data export the JSON and save on local device.</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">5. Download PDF</h3>
                <p className="text-gray-600">For an easier way to view your schedule download the PDF printout.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    

              {/* Right Side - Savings Section */}
              <div className="bg-white/10 rounded-lg p-4 sm:mr-2 w-full sm:w-auto max-w-xs self-center">
                {/* Total Savings */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <TrendingUp className="text-white w-8 h-8 sm:w-10 sm:h-10" />
                  <div>
                    <div className="text-white font-medium text-base sm:text-lg">
                      Projected Savings
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {formatCurrency(savings.total)}
                    </div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/20">
                  {/* Monthly Savings */}
                  <div className="text-center">
                    <div className="text-white/80 text-sm mb-1">Monthly</div>
                    <div className="text-white font-semibold">
                      {formatCurrency(savings.monthly)}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-white/80 text-sm mb-1">Percent</div>
                    <div className="text-white font-semibold">
                      %{savings?.percent || 0}
                    </div>
                  </div>

                  {/* Schedule Length */}
                  <div className="text-center">
                    <div className="text-white/80 text-sm mb-1">Duration</div>
                    <div className="text-white font-semibold">
                      {schedule?.length || 0} Checks
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Display */}
          <div className="bg-white px-6 py-4">
            {/* Action Buttons */}
            <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0 pt-4 border-t border-gray-100">
              <div className="flex space-x-3">
                <div className="group relative inline-block">
                  <button
                    onClick={handleExport}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export Data
                  </button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block">
                    <div className="bg-gray-800 text-white text-sm rounded py-1 px-2 whitespace-nowrap">
                      Save your data for later!
                      <div className="absolute w-2 h-2 bg-gray-800 rotate-45 left-1/2 -translate-x-1/2 bottom-[-4px]"></div>
                    </div>
                  </div>
                </div>

                <div className="group relative inline-block">
                  <button
                    onClick={handleImportClick}
                    className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
                  >
                    <FileUp className="w-4 h-4 mr-2" />
                    Import Data
                  </button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block">
                    <div className="bg-gray-800 text-white text-sm rounded py-1 px-2 whitespace-nowrap">
                      Import your data
                      <div className="absolute w-2 h-2 bg-gray-800 rotate-45 left-1/2 -translate-x-1/2 bottom-[-4px]"></div>
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
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
          <main className="lg:flex-1 space-y-6">
            <BillList bills={bills} setBillsAction={setBills} />
            <PaymentSchedule
              schedule={schedule}
              setScheduleAction={setSchedule}
              savings={savings}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
