// types.d.ts
import { jsPDF } from 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Modified PDF generation code section
if (alloc.bills.length > 0) {
  autoTable(doc, {
    startY: scheduleY,
    head: [["Bill Name", "Payment", "APR", "Due Date", "Status"]],
    body: alloc.bills.map((b) => {
      const billDueDate = new Date(b.dueDate);
      const daysLate = Math.ceil(
        (new Date(alloc.payDate).getTime() - billDueDate.getTime()) / (1000 * 60 * 60 * 24)
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
  
  // Safely access lastAutoTable
  const finalY = (doc as any).lastAutoTable?.finalY ?? scheduleY + 15;
  scheduleY = finalY + 10;
} else {
  doc.text("No bills assigned to this paycheck.", 15, scheduleY);
  scheduleY += 15;
}