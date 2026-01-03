export interface Bill {
    id?: string;
    name: string;
    paymentAmount: number;
    apr: number;
    remainingBalance: number;
    dueDate: string;
    billType: "recurring" | "one-time" | "other";
    allowableLateDay?: number;
    instanceId?: string;  // Add this line
  }
  
  export interface IncomeSource {
    id: string;
    name: string; // e.g., "Primary Job", "Spouse Income", "Side Gig"
    amount: number;
    frequency: "weekly" | "biweekly" | "monthly" | "twicemonthly";
    lastPayDate: string;
    firstPayDay?: number;  // Day of month for first paycheck (1-31), used with twicemonthly
    secondPayDay?: number; // Day of month for second paycheck (1-31), used with twicemonthly
  }

  export interface Income {
    sources: IncomeSource[];
    miscPercent: number;   // Savings percentage (shared across all sources)
    monthsToShow: number;  // Projection months (shared across all sources)
  }

  export interface OneTimeBill {
    id: string;
    userId: string;
    name: string;
    amount: number;
    paycheckDate: string;  // The paycheck date this bill is assigned to (YYYY-MM-DD)
    dueDate?: string | null;  // Optional due date for the bill
    isPaid: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface AllocatedBill extends Bill {
    isLate?: boolean;
    isCriticallyLate?: boolean;  // Past allowable late days (in grace period)
    isUnderfunded?: boolean;     // Not enough funds in paycheck to cover this bill
    daysLate?: number;           // Number of days late
    instanceId?: string;
  }

  export interface PaycheckSavings {
    id: string;
    userId: string;
    paycheckDate: string;  // The paycheck date (YYYY-MM-DD)
    amount: number;        // Custom savings amount for this specific paycheck
    isDeposited: boolean;  // Whether savings have been deposited
    createdAt: string;
    updatedAt: string;
  }

  export interface BillPayment {
    id: string;
    userId: string;
    paycheckDate: string;  // The paycheck date this payment is for (YYYY-MM-DD)
    billName: string;      // Name of the bill
    billDueDate: string;   // Due date of the bill instance (YYYY-MM-DD)
    isPaid: boolean;
    paidAt: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface BillPaycheckAmount {
    id: string;
    userId: string;
    billName: string;      // Name of the bill (to match with bill instances)
    billDueDate: string;   // Due date of the specific bill instance (YYYY-MM-DD)
    paycheckDate: string;  // The paycheck date this override is for (YYYY-MM-DD)
    amount: number;        // Custom amount for this specific paycheck
    createdAt: string;
    updatedAt: string;
  }

  export interface PaycheckAmountOverride {
    id: string;
    userId: string;
    sourceId: string;      // The income source this override is for
    paycheckDate: string;  // The paycheck date (YYYY-MM-DD)
    amount: number;        // Override gross paycheck amount
    createdAt: string;
    updatedAt: string;
  }