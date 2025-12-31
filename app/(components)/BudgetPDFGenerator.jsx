import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import '../styles/globals.css';

// Utility functions
const formatCurrency = (value) => `$${value.toFixed(2)}`;
const formatPercentage = (value) => `${value.toFixed(1)}%`;

// Component to handle PDF generation
const BudgetPDFGenerator = ({
  monthlyIncome,
  yearlyIncome,
  income,
  bills,
  schedule,
  allSuggestions,
}) => {
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });

    // Header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 297, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Budget Planner", 15, 12);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 240, 12);

    // Draw Section Helper
    const drawSection = (x, y, width, height, title, metrics) => {
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, width, height, 2, 2, "FD");

      doc.setFillColor(41, 128, 185);
      doc.roundedRect(x, y, width, 10, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(title, x + 5, y + 7);

      let metricY = y + 18;
      metrics.forEach(([label, value]) => {
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(label, x + 5, metricY);

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(value, x + 5, metricY + 6);
        metricY += 12;
      });
    };

    // Draw income, statistics, and schedule sections
    drawSection(10, 25, 90, 45, "Income", [
      ["Monthly Income", formatCurrency(monthlyIncome)],
      ["Yearly Income", formatCurrency(yearlyIncome)],
      ["Savings Rate", `${income.miscPercent}%`],
    ]);
    // Calculate actual statistics from user data
    const totalBillsAmount = bills.reduce((sum, b) => sum + b.paymentAmount, 0);
    const budgetUsage = monthlyIncome > 0 ? (totalBillsAmount / monthlyIncome) * 100 : 0;
    const projectedSavings = monthlyIncome * (income.miscPercent / 100);

    drawSection(105, 25, 90, 45, "Statistics", [
      ["Budget Usage", formatPercentage(budgetUsage)],
      ["Total Bills", formatCurrency(totalBillsAmount)],
      ["Projected Savings", formatCurrency(projectedSavings)],
    ]);
    drawSection(200, 25, 90, 45, "Schedule", [
      ["Payment Periods", schedule.length.toString()],
      ["Total Bills", bills.length.toString()],
      ["Recurring Bills", bills.filter((b) => b.billType === "recurring").length.toString()],
    ]);

    // Bills table
    doc.setFontSize(12);
    doc.text("Bills Overview", 15, 75);
    autoTable(doc, {
      startY: 85,
      head: [["Bill", "Amount", "Due Date", "APR", "Type", "Status"]],
      body: bills.map((b) => [
        b.name,
        formatCurrency(b.paymentAmount),
        new Date(b.dueDate).toLocaleDateString(),
        `${b.apr}%`,
        b.billType,
        schedule.some((alloc) =>
          alloc.bills.some((bill) => bill.name === b.name && bill.isLate)
        )
          ? "⚠️ Late"
          : "✓",
      ]),
      theme: "plain",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });

    // Suggestions section
    doc.addPage();
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("Recommended Schedule Adjustments", 15, 25);
    if (allSuggestions.length > 0) {
      autoTable(doc, {
        startY: 35,
        head: [["Bill", "Current Due Date", "Suggested Date", "Reason", "Financial Impact"]],
        body: allSuggestions.map((s) => [
          s.billName,
          new Date(s.originalDate).toLocaleDateString(),
          new Date(s.suggestedDate).toLocaleDateString(),
          "Optimize timing",
          "Improve cash flow distribution",
        ]),
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
      });
    } else {
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text("No schedule adjustments recommended at this time.", 15, 45);
    }

    doc.save("budget_planner_report.pdf");
  };

  return (
    <button onClick={handleDownloadPDF} className="btn btn-primary">
      Download PDF
    </button>
  );
};

export default BudgetPDFGenerator;
