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

const STORAGE_KEY = "@days_since_app_data_v2";

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
    > & { createdAt: number }
  ) => void;
  updateCounter: (id: string, updates: Partial<Counter>) => void;
  markCounterCompleted: (counterId: string) => void;
};

const CounterContext = createContext<CounterContextType>({
  counters: [],
  setCounters: () => console.warn("CounterProvider not used!"),
  addCounter: () => console.warn("CounterProvider not used!"),
  updateCounter: () => console.warn("CounterProvider not used!"),
  markCounterCompleted: () => console.warn("CounterProvider not used!"),
});

export const CounterProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
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
          "Failed to get push token for push notification! You might miss countdown alerts."
        );
      }
    })();
  }, []);

  // Function to mark a counter as completed
  const markCounterCompleted = useCallback((counterId: string) => {
    setCounters((prevCounters) =>
      prevCounters.map((counter) =>
        counter.id === counterId
          ? { ...counter, completed: true, isArchived: true }
          : counter
      )
    );
  }, []);

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
      > & { createdAt: number }
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
              `Exact time notification scheduled for ${newCounterData.name} with ID: ${exactTimeNotificationId}`
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
                `"Today" notification scheduled for ${newCounterData.name} with ID: ${todayNotificationId}`
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
                      10
                    )} has been reached`,
                    data: { counterId: id, notificationType: "exactTime" },
                    interruptionLevel: "timeSensitive",
                  },
                  trigger: null, // null trigger means immediate
                });
              console.log(
                `Immediate notification sent for ${newCounterData.name} with ID: ${exactTimeNotificationId}`
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
    [markCounterCompleted]
  ); // Depend on markCounterCompleted

  const updateCounter = useCallback((id: string, updates: Partial<Counter>) => {
    setCounters((prevCounters) =>
      prevCounters.map((counter) =>
        counter.id === id ? { ...counter, ...updates } : counter
      )
    );
  }, []);

  const contextValue = useMemo(
    () => ({
      counters,
      setCounters,
      addCounter,
      updateCounter,
      markCounterCompleted,
    }),
    [counters, setCounters, addCounter, updateCounter, markCounterCompleted]
  );

  // Splash screen while loading
  if (!isReady) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.splashText}>Loading Counters...</Text>
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
