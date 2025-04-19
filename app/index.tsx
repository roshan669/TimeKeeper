import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator, // Added for loading state
  Modal,
} from "react-native";
import {
  useTheme,
  Text,
  Button,
  TextInput,
  IconButton,
  Appbar,
  SegmentedButtons,
} from "react-native-paper";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns"; // For formatting the creation date
import DateTimePicker, {
  DateTimePickerEvent,
  EvtTypes,
} from "@react-native-community/datetimepicker";

import { useThemeContext } from "@/context/ThemeContext";

// Keep splash screen visible while fonts load or data loads
SplashScreen.preventAutoHideAsync();

// --- Counter Interface (Revised) ---
interface Counter {
  id: string;
  name: string;
  createdAt: number; // Timestamp (milliseconds since epoch) when created
  isArchived: boolean; // For Current/Past tabs
  hasNotification?: boolean; // Optional: for the bell icon
}

// --- AsyncStorage Key ---
const STORAGE_KEY = "@days_since_app_data_v2"; // Use versioned key

// --- Main App Component ---

type theme = "light" | "dark" | "system";

export default function Index() {
  const { toggleTheme, setTheme } = useThemeContext();
  const theme = useTheme(); // Access theme colors
  const [counters, setCounters] = useState<Counter[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newCounterName, setNewCounterName] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Track initial data load
  const [currentView, setCurrentView] = useState<"current" | "past">("current"); // State for tabs
  const [tick, setTick] = useState(0); // State to force updates for elapsed time
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [mode, setMode] = useState("date");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const themesetter = async () => {
      const theme = await AsyncStorage.getItem("theme");
      if (theme) setTheme(theme as theme);
    };
    themesetter();
  }, []);

  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShow(false);
    if (event.type === "set" && selectedDate) {
      const newSelection = selectedDate;
      const previousDate = date || new Date();
      let mergedDate: Date;
      if (mode === "date") {
        mergedDate = new Date(previousDate);
        mergedDate.setFullYear(newSelection.getFullYear());
        mergedDate.setMonth(newSelection.getMonth());
        mergedDate.setDate(newSelection.getDate());
      } else {
        mergedDate = new Date(previousDate);
        mergedDate.setHours(newSelection.getHours());
        mergedDate.setMinutes(newSelection.getMinutes());
        mergedDate.setSeconds(newSelection.getSeconds());
      }
      setDate(mergedDate);
    } else if (event.type === "dismissed") {
      setShow(false);
      setDate(undefined);
    }
  };

  const showMode = (currentMode: string) => {
    setShow(true);
    setMode(currentMode);
  };

  const showDatepicker = () => {
    showMode("date");
  };

  const showTimepicker = () => {
    showMode("time");
  };

  // --- Font Loading ---
  const [loaded, error] = useFonts({
    "Roboto-Regular": require("@/assets/fonts/roboto.ttf"),
    "Roboto-Bold": require("@/assets/fonts/boldonse.ttf"), // Ensure this path is correct
    "my-font": require("@/assets/fonts/myfont.ttf"),
    "bung-ee": require("@/assets/fonts/bungee.ttf"), // Ensure this path is correct
  });

  // --- Load Counters from Storage ---
  useEffect(() => {
    const loadCounters = async () => {
      try {
        const storedCounters = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedCounters !== null) {
          const parsedCounters: Partial<Counter>[] = JSON.parse(storedCounters);
          const correctedCounters: Counter[] = parsedCounters.map(
            (c, index) => ({
              id: c.id || `${Date.now()}-${index}`,
              name: c.name || "Unnamed Counter",
              createdAt: c.createdAt || Date.now(),
              isArchived: c.isArchived === true, // Ensure boolean
              hasNotification: c.hasNotification === true, // Ensure boolean
            })
          );
          setCounters(correctedCounters);
        }
      } catch (e) {
        console.error("Failed to load counters.", e);
        Alert.alert("Error", "Could not load saved counters.");
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadCounters();
  }, []);

  // --- Hide Splash Screen ---
  useEffect(() => {
    if ((loaded || error) && isDataLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, isDataLoaded]);

  // --- Save Counters to Storage ---
  useEffect(() => {
    if (!isDataLoaded) {
      return;
    }
    const saveCounters = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
      } catch (e) {
        console.error("Failed to save counters.", e);
      }
    };
    saveCounters();
  }, [counters, isDataLoaded]);

  // --- Global Timer for Live Elapsed Time Updates ---
  useEffect(() => {
    // Only run the timer if there are non-archived counters that are less than a day old
    const activeTimeCounters = counters.filter(
      (c) => !c.isArchived && Date.now() - c.createdAt < 24 * 60 * 60 * 1000
    );
    if (activeTimeCounters.length === 0) {
      // console.log("No active time counters, stopping timer.");
      return; // No need for a timer if only days are shown or only archived items exist
    }
    // console.log("Active time counters found, starting timer.");

    const intervalId = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000); // Update every second

    // Cleanup function
    return () => {
      // console.log("Cleaning up timer.");
      clearInterval(intervalId);
    };
    // Rerun when counters change, or when view changes (to potentially stop/start timer if view switches to/from 'Past')
  }, [counters, currentView]);

  // --- Filtered Counters for Display ---
  const displayedCounters = useMemo(() => {
    // console.log(`Filtering counters for view: ${currentView}`);
    // console.log(tick);
    return counters.filter((c) =>
      currentView === "current" ? !c.isArchived : c.isArchived
    );
  }, [counters, currentView]);

  // --- Action Handlers ---
  const handleAddCounter = () => {
    if (newCounterName.trim() === "") {
      Alert.alert("Missing Name", "Please enter a name for the counter.");
      return;
    }

    // This line now correctly uses the picked date/time if 'date' has a value,
    // otherwise it falls back to the current time.
    const creationTime = date ? date.getTime() : Date.now();

    const newCounter: Counter = {
      id: Date.now().toString(), // Consider a more robust ID like UUID
      name: newCounterName.trim(),
      createdAt: creationTime, // Use the determined time
      isArchived: false,
      hasNotification: false, // Default value
    };
    setCounters((prevCounters) => [newCounter, ...prevCounters]);
    setNewCounterName("");
    // setDate(undefined); // <-- Reset date state back to undefined after adding
    setIsModalVisible(false);
  };

  const handleDeleteCounter = (id: string) => {
    const counterToDelete = counters.find((c) => c.id === id);
    Alert.alert(
      "Delete Counter",
      `Are you sure you want to delete "${
        counterToDelete?.name || "this counter"
      }"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setCounters((prevCounters) =>
              prevCounters.filter((counter) => counter.id !== id)
            );
          },
        },
      ]
    );
  };

  const handleArchiveToggle = (id: string) => {
    const targetCounter = counters.find((c) => c.id === id);
    if (!targetCounter) return;

    const nextIsArchived = !targetCounter.isArchived;
    setCounters((prevCounters) =>
      prevCounters.map((counter) =>
        counter.id === id ? { ...counter, isArchived: nextIsArchived } : counter
      )
    );
    Alert.alert(
      nextIsArchived ? "Archived" : "Unarchived",
      `"${targetCounter.name}" moved to ${nextIsArchived ? "Past" : "Current"}.`
    );
  };

  // --- Render Item for FlatList ---
  const renderCounterItem = useCallback(
    ({ item }: { item: Counter }) => {
      const now = Date.now();
      const elapsedMs = Math.max(0, now - item.createdAt);

      const totalSeconds = Math.floor(elapsedMs / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const totalDays = Math.floor(totalHours / 24);

      let displayValue: string | number;
      let displayLabel: string;
      let isDaysView = false;
      let baseStyle = styles.hoursMinutesSecondsNumber; // Default to H/M/S style

      if (totalDays > 0) {
        displayValue = totalDays;
        displayLabel = totalDays === 1 ? "DAY SINCE" : "DAYS SINCE";
        isDaysView = true;
        baseStyle = styles.daysNumber; // Switch to Days style
      } else if (totalHours >= 1) {
        displayValue = totalHours;
        displayLabel = "HOURS SINCE";
      } else if (totalMinutes >= 1) {
        displayValue = totalMinutes;
        displayLabel = "MINUTES SINCE";
      } else {
        displayValue = totalSeconds;
        displayLabel = "SECONDS SINCE";
      }

      const formattedDate = format(new Date(item.createdAt), "MMM dd, yyyy"); // Corrected format string

      // Get font size and line height from the determined base style
      const valueFontSize = baseStyle.fontSize;
      const valueLineHeight = baseStyle.lineHeight;

      return (
        <TouchableOpacity
          // onPress={() => Alert.alert("Item Pressed", item.name)} // Example press
          onLongPress={() => handleArchiveToggle(item.id)} // Long press to archive/unarchive
          delayLongPress={1000}
        >
          <View style={styles.cardContainer}>
            <LinearGradient
              colors={["#FEC9CE", "#FF96A1"]}
              start={{ x: 1, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={styles.gradient}
            >
              <View style={styles.cardContent}>
                {/* Left Side */}
                <View style={styles.leftColumn}>
                  <Text
                    style={[
                      // Apply the base style first (contains fontFamily)
                      baseStyle,
                      // Override only specific properties if needed, but fontSize/lineHeight are already in baseStyle
                      // { fontSize: valueFontSize, lineHeight: valueLineHeight },
                    ]}
                    // Use tick in key ONLY if it's H/M/S view and ONLY if item is not archived
                    key={
                      !isDaysView && !item.isArchived
                        ? `time-${tick}`
                        : `static-${item.id}`
                    }
                  >
                    {displayValue}
                  </Text>
                  <Text style={styles.daysLabel}>{displayLabel}</Text>
                </View>

                {/* Right Side */}
                <View style={styles.rightColumn}>
                  <Text style={styles.dateText}>{formattedDate}</Text>
                  <Text
                    style={styles.nameText}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.name}
                  </Text>
                </View>

                {/* Optional: Notification Bell Icon */}
                {item.hasNotification && (
                  <IconButton
                    icon="bell-outline"
                    size={18}
                    style={styles.notificationIcon}
                    iconColor={"rgba(0, 0, 0, 0.6)"}
                  />
                )}

                {/* Trash Icon */}
                <IconButton
                  icon="delete-outline"
                  size={20}
                  onPress={() => handleDeleteCounter(item.id)}
                  iconColor={theme.colors.onPrimary}
                  style={styles.deleteIcon}
                />
              </View>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      );
    },
    [theme.colors.error, tick] // Include tick to update H/M/S views
  );

  // --- Main Render ---
  if (!loaded || !isDataLoaded) {
    // Keep returning null or a minimal loading indicator while splash screen is visible
    // Avoid rendering the main layout until ready to prevent flashes
    return null;
  }
  if (error) {
    console.error("Font loading error:", error);
    // Handle font error more gracefully if needed
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme?.colors?.background || "#fff" },
        ]}
      >
        <View style={styles.centeredError}>
          <Text
            style={{ color: theme?.colors?.error || "red", marginBottom: 10 }}
          >
            Error loading application assets.
          </Text>
          <Text style={{ color: theme?.colors?.onSurface || "#000" }}>
            Please restart the app. Font: {error.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Custom Header */}
      <Appbar.Header
        mode="center-aligned"
        elevated={false}
        style={{ backgroundColor: theme.colors.background }}
      >
        <Appbar.Action icon="theme-light-dark" onPress={() => toggleTheme()} />
        <Appbar.Content title="" />
        <Appbar.Action
          icon="plus"
          size={28}
          onPress={() => {
            // setDate(undefined); // Reset date when opening modal
            setIsModalVisible(true);
          }}
        />
      </Appbar.Header>

      {/* Current/Past Tabs */}
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={currentView}
          onValueChange={(value) => setCurrentView(value as "current" | "past")}
          style={styles.segmentButtons}
          density="medium"
          buttons={[
            {
              value: "current",
              label: "Current",
              style:
                currentView === "current"
                  ? styles.segmentSelected
                  : styles.segmentUnselected,
              labelStyle:
                currentView === "current"
                  ? styles.segmentSelectedLabel
                  : styles.segmentUnselectedLabel,
            },
            {
              value: "past",
              label: "Past",
              style:
                currentView === "past"
                  ? styles.segmentSelected
                  : styles.segmentUnselected,
              labelStyle:
                currentView === "past"
                  ? styles.segmentSelectedLabel
                  : styles.segmentUnselectedLabel,
            },
          ]}
        />
      </View>

      <View style={{ flex: 1 }}>
        <FlatList
          data={displayedCounters}
          renderItem={renderCounterItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                No counters {currentView === "past" ? "archived" : "yet"}.
              </Text>
              {/* Show loading indicator only during initial load on 'Current' tab */}
              {currentView === "current" && !isDataLoaded && (
                <ActivityIndicator style={{ marginTop: 20 }} size="large" />
              )}
              {/* Show add prompt only after load and if empty on 'Current' tab */}
              {currentView === "current" &&
                isDataLoaded &&
                displayedCounters.length === 0 && (
                  <Text style={styles.emptyText}>Press '+' to add one!</Text>
                )}
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </View>

      {/* Add New Counter Modal */}

      <Modal
        animationType="fade"
        hardwareAccelerated
        visible={isModalVisible}
        statusBarTranslucent
        transparent
        onRequestClose={() => {
          setIsModalVisible(false);
          setDate(undefined);
        }}
        style={[
          styles.modalContainer,
          { backgroundColor: theme.colors.elevation.level2 },
        ]}
      >
        <LinearGradient
          colors={["#FEC9CE", "#FF96A3"]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.addgradient}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Add New Counter
          </Text>
          <TextInput
            label="Name"
            outlineColor="#FF96A3"
            selectionColor="red"
            // cursorColor="#fff"
            activeOutlineColor="#fff"
            // value={newCounterName}
            onChangeText={setNewCounterName}
            mode="outlined"
            style={[
              styles.modalInput,
              { backgroundColor: "#FF96A3", borderRadius: 40 },
            ]}
            autoFocus
          />
          <Button
            style={styles.modalButton}
            labelStyle={styles.buttonLabel}
            mode="outlined"
            onPress={showDatepicker}
          >
            Show Date picker
          </Button>
          <Button
            style={[styles.modalButton, { marginTop: 10 }]}
            labelStyle={styles.buttonLabel}
            mode="outlined"
            onPress={showTimepicker}
          >
            Show Time picker
          </Button>
          <Text
            style={[
              styles.selectedDateText,
              { color: theme.colors.background },
            ]}
          >
            {date ? date.toLocaleString() : "Not Selected"}
          </Text>
          (
          {show && (
            <DateTimePicker
              value={date ? date : new Date()}
              mode={mode}
              is24Hour={false}
              display="spinner"
              onChange={onChange}
            />
          )}
          )
          <View style={styles.modalButtonRow}>
            <Button
              mode="elevated"
              onPress={() => {
                setIsModalVisible(false);
              }}
              style={[styles.modalButton, { backgroundColor: "#ff96a3" }]}
              labelStyle={styles.buttonLabel} // Apply consistent label style
            >
              Cancel
            </Button>
            <Button
              mode="elevated"
              onPress={handleAddCounter}
              style={[styles.modalButton, { backgroundColor: "#ff96a3" }]}
              disabled={!newCounterName.trim()}
              labelStyle={styles.buttonLabel} // Apply consistent label style
            >
              Add
            </Button>
          </View>
        </LinearGradient>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  selectedDateText: {
    textAlign: "center",
    fontSize: 14,
    // color is set dynamically using theme
    marginVertical: 15, // Add some space around it
  },
  container: {
    flex: 1,
  },
  centered: {
    flexGrow: 1, // Use flexGrow instead of flex: 1
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 50, // Add some padding at the bottom
    // marginTop: 60, // Remove fixed marginTop if using flexGrow
  },
  centeredError: {
    // Style for error display
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  segmentContainer: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: "15%",
  },
  segmentButtons: {
    borderRadius: 10,
  },
  segmentSelected: {
    backgroundColor: "#FEC9CE",
    // borderColor: "#FEC9CE",
    // borderWidth: 1.5, // Make border slightly thicker
  },
  segmentUnselected: {
    backgroundColor: "transparent",
    // borderColor: "#cccccc",
    // borderWidth: 1.5, // Make border slightly thicker
  },
  segmentSelectedLabel: {
    fontFamily: "Roboto-Regular", // Use bold font
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    // textTransform: "uppercase",
  },
  segmentUnselectedLabel: {
    fontFamily: "Roboto-Regular", // Use regular font
    fontSize: 14,
    color: "#555",
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 30,
    paddingTop: 10,
    flexGrow: 1,
  },
  cardContainer: {
    marginVertical: 7,
    borderRadius: 18,
    backgroundColor: "white",
    elevation: 3,
  },
  gradient: {
    borderRadius: 18,
    overflow: "hidden",
  },
  addgradient: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    borderRadius: 16,
    padding: 30,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    position: "relative",
  },
  leftColumn: {
    alignItems: "center",
    justifyContent: "center",
    width: 110,
  },
  rightColumn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "baseline",

    marginBottom: 30,
  },
  // Style for the main number display (Days)
  daysNumber: {
    fontSize: 55,
    fontFamily: "bung-ee", // <<< Uses your custom font
    // fontWeight: "900", // Fallback if font doesn't load/support weight
    color: "#111",
    lineHeight: 70, // Adjust if font requires different line height
    textAlign: "center",
  },
  // Style for the main number display (Hours, Minutes, Seconds)
  hoursMinutesSecondsNumber: {
    fontSize: 55, // Keep consistent or adjust as needed
    fontFamily: "bung-ee", // <<< Uses your custom font
    // fontWeight: "bold", // Fallback
    color: "#111",
    lineHeight: 70, // Adjust if font requires different line height
    textAlign: "center",
  },
  daysLabel: {
    fontSize: 10,
    fontFamily: "my-font", // Consider a specific font for labels if needed
    color: "#333",
    letterSpacing: 1.2,
    fontWeight: "900",

    marginTop: 4,
    textTransform: "uppercase",
    textAlign: "center",
  },
  dateText: {
    fontSize: 15,
    fontFamily: "Roboto-Regular",
    color: "#555",
    marginBottom: 4,
    fontWeight: "bold",
  },
  nameText: {
    fontSize: 20,
    fontFamily: "Roboto-Regular",
    fontWeight: "bold",
    color: "#000",
    lineHeight: 20,
  },
  notificationIcon: {
    position: "absolute",
    top: 5,
    right: 35, // Make space for delete icon
    zIndex: 1,
  },
  deleteIcon: {
    position: "absolute",
    top: 5,
    right: 5,
    zIndex: 1,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 30,
    fontFamily: "my-font", // Use a standard font
    color: "#777",
    marginTop: 15,
    lineHeight: 35,
    fontWeight: "condensedBold",
  },
  modalContainer: {
    margin: 20,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    // backgroundColor: "white",
  }, // Ensure background
  modalTitle: {
    marginBottom: 25,
    textAlign: "center",
    fontFamily: "Roboto-Bold",
    fontSize: 15,
  },
  modalInput: { marginBottom: 25 },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 15,
  },
  modalButton: { minWidth: 110, borderRadius: 8, backgroundColor: "#ff96a3" },
  buttonLabel: {
    color: "#000",
    fontSize: 14,
  },
});
