import { Counter } from "@/types/counter";
import { MyWidget } from "@/widget/CounterList";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  createContext,
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Appearance,
  StyleSheet,
  Text,
  View,
} from "react-native"; // Import for splash screen
import { requestWidgetUpdate } from "react-native-android-widget";
import { useThemeContext } from "./ThemeContext";

// Set up notification handler for when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

import { Recurrence } from "@/types/counter";

const STORAGE_KEY = "@days_since_app_data_v2";

// --- Helper: Calculate next recurrence date ---
function getNextRecurrenceDate(
  currentTargetDate: number,
  recurrence: Recurrence,
  customDays?: number,
): number | null {
  const date = new Date(currentTargetDate);

  switch (recurrence) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    case "custom":
      if (customDays && customDays > 0) {
        date.setDate(date.getDate() + customDays);
      } else {
        return null;
      }
      break;
    case "none":
    default:
      return null;
  }

  return date.getTime();
}

type CounterContextType = {
  counters: Counter[];
  setCounters: Dispatch<SetStateAction<Counter[]>>;
  addCounter: (
    newCounter: Omit<
      Counter,
      | "id"
      | "isArchived"
      | "completed"
      | "notificationId"
      | "todayNotificationId"
      | "nextRecurrenceDate"
    > & { createdAt: number },
  ) => void;
  updateCounter: (id: string, updates: Partial<Counter>) => void;
  deleteCounter: (id: string) => void;
  markCounterCompleted: (counterId: string) => void;
};

const CounterContext = createContext<CounterContextType>({
  counters: [],
  setCounters: () => console.warn("CounterProvider not used!"),
  addCounter: () => console.warn("CounterProvider not used!"),
  updateCounter: () => console.warn("CounterProvider not used!"),
  deleteCounter: () => console.warn("CounterProvider not used!"),
  markCounterCompleted: () => console.warn("CounterProvider not used!"),
});

export const CounterProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { themeMode } = useThemeContext();
  const [counters, setCounters] = useState<Counter[]>([]);
  const [isReady, setIsReady] = useState(false);

  // --- Load counters from AsyncStorage on startup ---
  useEffect(() => {
    const loadCounters = async () => {
      try {
        const storedCounters = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedCounters) {
          setCounters(JSON.parse(storedCounters));
        }
      } catch (e) {
        console.error("Failed to load counters from storage", e);
      } finally {
        setIsReady(true); // Mark as ready after attempting to load
      }
    };
    loadCounters();
  }, []);

  // --- Save counters to AsyncStorage whenever they change ---
  useEffect(() => {
    if (isReady) {
      // Only save once initial load is complete
      const saveCounters = async () => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
          requestWidgetUpdate({
            widgetName: "TimeKeeper",
            renderWidget: () => (
              <MyWidget data={counters} theme={Appearance.getColorScheme()} />
            ),
            widgetNotFound: () => {
              // Called if no widget is added
            },
          });
        } catch (e) {
          console.error("Failed to save counters to storage", e);
        }
      };
      saveCounters();
    }
  }, [counters, isReady]);

  // Request notification permissions
  useEffect(() => {
    (async () => {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        alert(
          "Failed to get push token for push notification! You might miss countdown alerts.",
        );
      }
    })();
  }, []);

  // --- Helper: Schedule notifications for a countdown counter ---
  const scheduleCountdownNotifications = useCallback(
    async (
      counterName: string,
      targetDate: number,
      counterId: string,
    ): Promise<{ exactId?: string; todayId?: string }> => {
      const triggerDate = new Date(targetDate);
      const now = new Date();
      let exactId: string | undefined;
      let todayId: string | undefined;

      if (triggerDate.getTime() > now.getTime()) {
        try {
          exactId = await Notifications.scheduleNotificationAsync({
            content: {
              title: "Countdown Finished!",
              body: `${counterName.substring(0, 10)}`,
              data: { counterId, notificationType: "exactTime" },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
            },
          });
        } catch (error) {
          console.error("Error scheduling exact time notification:", error);
        }

        const todayNotificationTime = new Date(triggerDate);
        todayNotificationTime.setHours(21, 0, 0, 0);

        if (
          todayNotificationTime.getTime() > now.getTime() &&
          todayNotificationTime.getDate() === triggerDate.getDate() &&
          todayNotificationTime.getMonth() === triggerDate.getMonth() &&
          todayNotificationTime.getFullYear() === triggerDate.getFullYear()
        ) {
          try {
            todayId = await Notifications.scheduleNotificationAsync({
              content: {
                title: "Countdown Update!",
                body: `${counterName} ends today at ${triggerDate.toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}!`,
                data: { counterId, notificationType: "today" },
                vibrate: [2, 3, 4],
                interruptionLevel: "active",
                sticky: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: todayNotificationTime,
              },
            });
          } catch (error) {
            console.error("Error scheduling 'today' notification:", error);
          }
        }
      }

      return { exactId, todayId };
    },
    [],
  );

  // Function to mark a counter as completed
  // If recurring, auto-reschedules to the next occurrence instead of archiving
  const markCounterCompleted = useCallback(
    (counterId: string) => {
      setCounters((prevCounters) => {
        const counter = prevCounters.find((c) => c.id === counterId);
        if (!counter) return prevCounters;

        // If recurring countdown, reschedule instead of archiving
        if (
          counter.type === "countdown" &&
          counter.recurrence &&
          counter.recurrence !== "none"
        ) {
          const nextDate = getNextRecurrenceDate(
            counter.createdAt,
            counter.recurrence,
            counter.customRecurrenceDays,
          );

          if (nextDate) {
            // Cancel old notifications
            if (counter.notificationId) {
              Notifications.cancelScheduledNotificationAsync(
                counter.notificationId,
              ).catch(() => {});
            }
            if (counter.todayNotificationId) {
              Notifications.cancelScheduledNotificationAsync(
                counter.todayNotificationId,
              ).catch(() => {});
            }

            // Schedule new notifications for next occurrence
            scheduleCountdownNotifications(
              counter.name,
              nextDate,
              counter.id,
            ).then(({ exactId, todayId }) => {
              setCounters((current) =>
                current.map((c) =>
                  c.id === counterId
                    ? {
                        ...c,
                        notificationId: exactId,
                        todayNotificationId: todayId,
                      }
                    : c,
                ),
              );
            });

            return prevCounters.map((c) =>
              c.id === counterId
                ? {
                    ...c,
                    createdAt: nextDate,
                    completed: false,
                    isArchived: false,
                    nextRecurrenceDate: nextDate,
                  }
                : c,
            );
          }
        }

        // Default: mark as completed and archived
        return prevCounters.map((c) =>
          c.id === counterId ? { ...c, completed: true, isArchived: true } : c,
        );
      });
    },
    [scheduleCountdownNotifications],
  );

  // Handle incoming notifications
  useEffect(() => {
    const notificationReceivedListener =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received in foreground:", notification);
        const notificationData = notification.request.content.data;
        if (notificationData && notificationData.counterId) {
          // Only mark complete if it's the final 'exact time' notification
          if (notificationData.notificationType === "exactTime") {
            markCounterCompleted(notificationData.counterId);
          }
        }
      });

    const notificationResponseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response received (user tapped):", response);
        const notificationData = response.notification.request.content.data;
        if (notificationData && notificationData.counterId) {
          if (notificationData.notificationType === "exactTime") {
            markCounterCompleted(notificationData.counterId);
          }
          // You might want to navigate to the counter's detail page here
          // if the user taps the notification.
        }
      });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && response.notification) {
        console.log("App launched from notification:", response.notification);
        const notificationData = response.notification.request.content.data;
        if (notificationData && notificationData.counterId) {
          if (notificationData.notificationType === "exactTime") {
            markCounterCompleted(notificationData.counterId);
          }
        }
      }
    });
  }, [markCounterCompleted]);

  const addCounter = useCallback(
    async (
      newCounterData: Omit<
        Counter,
        | "id"
        | "isArchived"
        | "completed"
        | "notificationId"
        | "todayNotificationId"
      > & { createdAt: number },
    ) => {
      const id = String(Date.now());

      let exactTimeNotificationId: string | undefined;
      let todayNotificationId: string | undefined;

      if (newCounterData.type === "countdown" && newCounterData.createdAt) {
        const triggerDate = new Date(newCounterData.createdAt); // The exact end time of countdown
        const now = new Date();

        // Ensure the countdown date is in the future for scheduling
        if (triggerDate.getTime() > now.getTime()) {
          // 1. Schedule "Exact Time Reached" notification
          try {
            exactTimeNotificationId =
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Countdown Finished!",
                  body: `${newCounterData.name.substring(0, 10)}`,
                  data: { counterId: id, notificationType: "exactTime" }, // Add type for identification
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DATE,
                  date: triggerDate,
                },
              });
            console.log(
              `Exact time notification scheduled for ${newCounterData.name} with ID: ${exactTimeNotificationId}`,
            );
          } catch (error) {
            console.error("Error scheduling exact time notification:", error);
          }

          // 2. Schedule "Today" notification (e.g., 9 AM or 7 PM today)
          const todayNotificationTime = new Date(triggerDate); // Start with triggerDate to get the correct day
          todayNotificationTime.setHours(21, 0, 0, 0); // Example: 9:00 PM (21:00) today. Adjust as needed.

          // If the 'today' notification time has already passed for the *countdown's target day*,
          // or if the countdown ends *tomorrow or later*, schedule it for 9 PM on the countdown's target day.
          // If the countdown ends *today* AND the 9 PM notification time is *still in the future*, schedule it.
          if (
            todayNotificationTime.getTime() > now.getTime() && // Must be in the future
            todayNotificationTime.getDate() === triggerDate.getDate() && // Must be on the same calendar day as the trigger
            todayNotificationTime.getMonth() === triggerDate.getMonth() &&
            todayNotificationTime.getFullYear() === triggerDate.getFullYear()
          ) {
            try {
              todayNotificationId =
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "Countdown Update!",
                    body: `${
                      newCounterData.name
                    } ends today at ${triggerDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}!`,
                    data: { counterId: id, notificationType: "today" }, // Add type for identification
                    vibrate: [2, 3, 4],
                    interruptionLevel: "active",
                    sticky: true,
                  },
                  trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: todayNotificationTime,
                  },
                });
              console.log(
                `"Today" notification scheduled for ${newCounterData.name} with ID: ${todayNotificationId}`,
              );
            } catch (error) {
              console.error("Error scheduling 'today' notification:", error);
            }
          }
        }
        // Handle the edge case where the countdown date/time is now or in the very recent past TODAY
        else {
          const isToday =
            triggerDate.getDate() === now.getDate() &&
            triggerDate.getMonth() === now.getMonth() &&
            triggerDate.getFullYear() === now.getFullYear();

          if (isToday && now.getTime() - triggerDate.getTime() < 10000) {
            // Within 10 seconds of "now"
            try {
              // Send an immediate notification for the exact time
              exactTimeNotificationId =
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "",
                    body: `${newCounterData.name.substring(
                      0,
                      10,
                    )} has been reached`,
                    data: { counterId: id, notificationType: "exactTime" },
                    interruptionLevel: "timeSensitive",
                  },
                  trigger: null, // null trigger means immediate
                });
              console.log(
                `Immediate notification sent for ${newCounterData.name} with ID: ${exactTimeNotificationId}`,
              );
              markCounterCompleted(id); // Mark as completed immediately
            } catch (error) {
              console.error("Error sending immediate notification:", error);
            }
          }
        }
      }

      const newCounter: Counter = {
        id: id,
        isArchived: false,
        completed: false,
        notificationId: exactTimeNotificationId, // Store the exact time notification ID
        todayNotificationId: todayNotificationId, // Store the "today" notification ID
        ...newCounterData,
      };

      setCounters((prevCounters) => [...prevCounters, newCounter]);
    },
    [markCounterCompleted],
  ); // Depend on markCounterCompleted

  const updateCounter = useCallback((id: string, updates: Partial<Counter>) => {
    setCounters((prevCounters) =>
      prevCounters.map((counter) =>
        counter.id === id ? { ...counter, ...updates } : counter,
      ),
    );
  }, []);

  const deleteCounter = useCallback(
    async (id: string) => {
      const counterToDelete = counters.find((c) => c.id === id);
      if (counterToDelete) {
        // Cancel notifications if they exist
        if (counterToDelete.notificationId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(
              counterToDelete.notificationId,
            );
            console.log(
              `Cancelled notification ${counterToDelete.notificationId}`,
            );
          } catch (error) {
            console.error("Error cancelling notification:", error);
          }
        }
        if (counterToDelete.todayNotificationId) {
          try {
            await Notifications.cancelScheduledNotificationAsync(
              counterToDelete.todayNotificationId,
            );
            console.log(
              `Cancelled today notification ${counterToDelete.todayNotificationId}`,
            );
          } catch (error) {
            console.error("Error cancelling today notification:", error);
          }
        }
      }

      setCounters((prevCounters) =>
        prevCounters.filter((counter) => counter.id !== id),
      );
    },
    [counters],
  );

  const contextValue = useMemo(
    () => ({
      counters,
      setCounters,
      addCounter,
      updateCounter,
      deleteCounter,
      markCounterCompleted,
    }),
    [
      counters,
      setCounters,
      addCounter,
      updateCounter,
      deleteCounter,
      markCounterCompleted,
    ],
  );

  // Splash screen while loading
  if (!isReady) {
    return (
      <View
        style={[
          styles.splashContainer,
          { backgroundColor: themeMode === "dark" ? "#000" : "#fff" },
        ]}
      >
        <ActivityIndicator size="large" color="#FF76A3" />
        <Text style={styles.splashText}>Loading...</Text>
      </View>
    );
  }

  return (
    <CounterContext.Provider value={contextValue}>
      {children}
    </CounterContext.Provider>
  );
};

export const useCounterContext = () => useContext(CounterContext);

// Styles for the splash screen
const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff", // Or your app's main background color
  },
  splashText: {
    marginTop: 20,
    fontSize: 18,
    color: "#333",
  },
});
