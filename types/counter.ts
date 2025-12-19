// --- Counter Interface ---
export interface Counter {
  id: string;
  name: string;
  createdAt: number; // Timestamp (milliseconds since epoch) when created
  isArchived: boolean; // For Current/Past tabs
  hasNotification?: boolean; // Optional: for the bell icon
  type: "countdown" | "countup";
  completed: boolean;
  notificationId: string | undefined;
  todayNotificationId?: string;
}

export enum CounterType {
  COUNTDOWN = "countdown",
  COUNTUP = "countup",
}