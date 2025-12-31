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