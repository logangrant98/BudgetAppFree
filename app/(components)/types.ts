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
  
  export interface Income {
    amount: number;
    frequency: "weekly" | "biweekly" | "monthly" | "twicemonthly";
    lastPayDate: string;
    miscPercent: number;
    monthsToShow: number;
    firstPayDay?: number;  // Day of month for first paycheck (1-31), used with twicemonthly
    secondPayDay?: number; // Day of month for second paycheck (1-31), used with twicemonthly
  }