import React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import '../styles/globals.css';

interface Bill {
  name: string;
  paymentAmount: number;
  apr: number;
  dueDate: string;
  billType: string;
}

interface ScheduledBill extends Bill {
  isLate: boolean;
}

interface PayPeriod {
  payDate: Date;
  bills: ScheduledBill[];
  paycheckAmount: number;
  usedFunds: number;
  suggestedChanges: Array<{
    billName: string;
    originalDate: string;
    suggestedDate: string;
  }>;
}

interface PDFProps {
  bills: Bill[];
  schedule: PayPeriod[];
  monthlyIncome: number;
  yearlyIncome: number;
  income: { miscPercent: number };
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getPayPeriodStats = (schedule: PayPeriod[]) => {
  const totalPaychecks = schedule.length;
  const totalIncome = schedule.reduce((sum, period) => sum + period.paycheckAmount, 0);
  const totalUsed = schedule.reduce((sum, period) => sum + period.usedFunds, 0);
  const totalSavings = totalIncome - totalUsed;
  const savingsPerPaycheck = totalSavings / totalPaychecks;
  const averageUsagePercent = (totalUsed / totalIncome) * 100;

  return {
    totalPaychecks,
    totalIncome,
    totalUsed,
    totalSavings,
    savingsPerPaycheck,
    averageUsagePercent
  };
};

export const handleDownloadPDF = ({ bills, schedule, monthlyIncome, income }: PDFProps) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    const stats = getPayPeriodStats(schedule);
    
    // Dashboard Header
    doc.setFontSize(24);
    doc.setTextColor(44, 62, 80);
    doc.text("Budget Planner Dashboard", 15, 20);

    // Pay Periods Overview
    doc.setFontSize(16);
    doc.setTextColor(52, 73, 94);
    doc.text("Pay Periods Overview", 15, 35);

    // Create pay period table
    const payPeriodsData = schedule.map((period, index) => [
      `Period ${index + 1}`,
      formatDate(period.payDate),
      formatCurrency(period.paycheckAmount),
      formatCurrency(period.usedFunds),
      formatCurrency(period.paycheckAmount - period.usedFunds),
      `${((period.usedFunds / period.paycheckAmount) * 100).toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Period", "Pay Date", "Amount", "Bills Total", "Available", "Usage"]],
      body: payPeriodsData,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [247, 250, 252],
      },
    });

    // Financial Summary Section
    const summaryY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text("Financial Summary", 15, summaryY);

    const metrics = [
      { label: "Monthly Income", value: formatCurrency(monthlyIncome) },
      { label: "Monthly Bills", value: formatCurrency(stats.totalUsed / (schedule.length / 2)) },
      { label: "Target Monthly Savings", value: formatCurrency(monthlyIncome * (income.miscPercent / 100)) },
      { label: "Per Pay Period", value: formatCurrency(monthlyIncome / (schedule.length / 2)) },
      { label: "Min. Savings Per Period", value: formatCurrency((monthlyIncome * (income.miscPercent / 100)) / (schedule.length / 2)) },
      { label: "Savings Rate", value: `${income.miscPercent}%` },
    ];

    let metricX = 15;
    let metricY = summaryY + 10;
    metrics.forEach((metric, index) => {
      if (index % 3 === 0 && index !== 0) {
        metricX = 15;
        metricY += 25;
      }

      doc.setFillColor(247, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(metricX, metricY - 5, 90, 20, 1, 1, 'FD');

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(metric.label, metricX + 5, metricY);

      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(metric.value, metricX + 5, metricY + 8);

      metricX += 95;
    });

    // Bills Overview
    const billsY = metricY + 30;
    doc.setFontSize(16);
    doc.setTextColor(52, 73, 94);
    doc.text("Bills Overview", 15, billsY);

    const billsData = bills.map((b) => [
      b.name,
      formatCurrency(b.paymentAmount),
      `${b.apr.toFixed(2)}%`,
      new Date(b.dueDate).toLocaleDateString(),
      b.billType,
    ]);

    autoTable(doc, {
      startY: billsY + 5,
      head: [["Bill Name", "Amount", "APR", "Due Date", "Type"]],
      body: billsData,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [247, 250, 252],
      },
    });

    // Detailed Schedule Pages
    doc.addPage('landscape');
    doc.setFontSize(18);
    doc.text("Detailed Payment Schedule", 15, 20);

    schedule.forEach((period, periodIndex) => {
      if (periodIndex > 0 && periodIndex % 2 === 0) {
        doc.addPage('landscape');
      }

      const yOffset = periodIndex % 2 === 0 ? 30 : 140;
      
      // Period Header
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, yOffset - 5, 270, 25, 1, 1, 'F');

      doc.setFontSize(14);
      doc.setTextColor(52, 73, 94);
      doc.text(
        `Pay Period ${periodIndex + 1}: ${formatDate(period.payDate)}`,
        15,
        yOffset + 5
      );

      const usagePercent = ((period.usedFunds / period.paycheckAmount) * 100).toFixed(1);
      const targetSavings = period.paycheckAmount * (income.miscPercent / 100);
      const actualSavings = period.paycheckAmount - period.usedFunds;
      
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text([
        `Paycheck: ${formatCurrency(period.paycheckAmount)}`,
        `Bills: ${formatCurrency(period.usedFunds)} (${usagePercent}%)`,
        `Target Savings: ${formatCurrency(targetSavings)}`,
        `Actual Savings: ${formatCurrency(actualSavings)}`,
      ].join(" | "), 15, yOffset + 15);

      if (period.bills.length > 0) {
        autoTable(doc, {
          startY: yOffset + 25,
          head: [["Bill Name", "Payment", "APR", "Due Date", "Status"]],
          body: period.bills.map((b) => [
            b.name,
            formatCurrency(b.paymentAmount),
            `${b.apr.toFixed(2)}%`,
            new Date(b.dueDate).toLocaleDateString(),
            b.isLate ? "Late" : "On Time",
          ]),
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: {
            fillColor: [52, 73, 94],
            textColor: 255,
          },
          alternateRowStyles: {
            fillColor: [247, 250, 252],
          },
          margin: { top: 0 },
        });
      } else {
        doc.text("No bills assigned to this paycheck.", 15, yOffset + 30);
      }
    });

    doc.save("budget_planner_report.pdf");
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Error generating PDF report. Please try again.");
  }
};

const DownloadPDF = ({ bills, schedule, monthlyIncome, yearlyIncome, income }: PDFProps) => {
  return (
    <button
      onClick={() =>
        handleDownloadPDF({ bills, schedule, monthlyIncome, yearlyIncome, income })
      }
      className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
    >
      <svg 
        className="w-4 h-4 mr-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
        />
      </svg>
      Download PDF Report
    </button>
  );
};

export default DownloadPDF;