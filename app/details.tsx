import EditModal from "@/components/edit.modal";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Icon, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export interface data {
  hours: string;
  days: string;
  minutes: string;
  seconds: string;
}

export default function Details() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const scale = Math.min(width / 375, height / 812); // Base on iPhone X dimensions

  const normalize = (size: number) => {
    const newSize = size * scale;
    return Math.round(newSize);
  };

  const [fontsLoaded] = useFonts({
    // Renamed 'loaded' to 'fontsLoaded' for clarity
    "Roboto-Regular": require("@/assets/fonts/roboto.ttf"),
    "Roboto-Bold": require("@/assets/fonts/boldonse.ttf"), // Double-check this path and internal font name
    "my-font": require("@/assets/fonts/myfont.ttf"), // Double-check this path and internal font name
    "bung-ee": require("@/assets/fonts/bungee.ttf"), // Double-check this path and internal font name
  });

  // console.log("Fonts loaded! Rendering content."); // For debugging

  const theme = useTheme();
  const { creation, name, id, type, completed } = useLocalSearchParams<{
    creation: string;
    name: string;
    id: string;
    type: string;
    completed: string;
  }>();
  const createdAt = parseInt(Array.isArray(creation) ? creation[0] : creation);

  const [calculated, setCalculated] = useState<data | undefined>();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const calculationsCountup = useCallback((creationTimestamp: number) => {
    const now = Date.now();
    const elapsedMs = Math.max(0, now - creationTimestamp);

    const totalSeconds = Math.floor(elapsedMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const seconds = totalSeconds % 60;
    const minutes = totalMinutes % 60;
    const hours = totalHours % 24;
    const days = totalDays;

    setCalculated({
      days: String(days).padStart(2, "0"),
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
    });
  }, []);
  const calculationsCountdown = useCallback((creationTimestamp: number) => {
    const now = Date.now();
    const elapsedMs = Math.max(0, creationTimestamp - now);

    const totalSeconds = Math.floor(elapsedMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    const seconds = totalSeconds % 60;
    const minutes = totalMinutes % 60;
    const hours = totalHours % 24;
    const days = totalDays;

    setCalculated({
      days: String(days).padStart(2, "0"),
      hours: String(hours).padStart(2, "0"),
      minutes: String(minutes).padStart(2, "0"),
      seconds: String(seconds).padStart(2, "0"),
    });
  }, []);

  useEffect(() => {
    //  Perform initial calculation immediately
    if (type === "countup") {
      calculationsCountup(createdAt);

      // Then set up the interval for subsequent updates
      intervalRef.current = setInterval(() => {
        calculationsCountup(createdAt);
      }, 1000);
    } else {
      calculationsCountdown(createdAt);

      // Then set up the interval for subsequent updates
      intervalRef.current = setInterval(() => {
        calculationsCountdown(createdAt);
      }, 1000);
    }

    // Clean up the interval when the component unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [createdAt, calculationsCountup, calculationsCountdown, type]);

  const createdAtDate = new Date(createdAt);

  const formattedCreatedAt = createdAtDate.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = createdAtDate.toLocaleTimeString();

  // If fonts are not loaded, display a loading indicator or null
  if (!fontsLoaded) {
    // console.log("Fonts are not loaded yet..."); // For debugging
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: "#fff", marginTop: 10 }}>Loading Fonts...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={
        type === "countdown" ? ["#E0E0E0", "#4285F4"] : ["#FED0CE", "#FF9693"]
      }
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.addgradient}>
        {completed === "false" && (
          <View style={styles.topContainer}>
            <Text
              style={[
                styles.gradientText,
                { fontSize: normalize(20), lineHeight: normalize(40) },
              ]}
            >
              {type === "countup" && "Since"} {formattedCreatedAt}
            </Text>
            <Text
              style={[
                styles.gradientText,
                { fontSize: normalize(30), lineHeight: normalize(40) },
              ]}
            >
              {name.substring(0, 20)}
            </Text>
          </View>
        )}

        {type === "countup" || completed === "false" ? (
          <View style={styles.timeDisplay}>
            <View style={{ alignItems: "center" }}>
              <Text
                style={[
                  styles.timeValue,
                  { fontSize: normalize(70), lineHeight: normalize(110) },
                ]}
              >
                {calculated?.days}
              </Text>

              <Text
                style={[
                  styles.timeLabel,
                  { fontSize: normalize(30), lineHeight: normalize(50) },
                ]}
              >
                Days
              </Text>
            </View>

            <View style={{ alignItems: "center" }}>
              <Text
                style={[
                  styles.timeValue,
                  { fontSize: normalize(60), lineHeight: normalize(90) },
                ]}
              >
                {calculated?.hours}
              </Text>
              <Text
                style={[
                  styles.timeLabel,
                  { fontSize: normalize(30), lineHeight: normalize(50) },
                ]}
              >
                Hours
              </Text>
            </View>

            <View style={{ alignItems: "center" }}>
              <Text
                style={[
                  styles.timeValue,
                  { fontSize: normalize(55), lineHeight: normalize(80) },
                ]}
              >
                {calculated?.minutes}
              </Text>

              <Text
                style={[
                  styles.timeLabel,
                  { fontSize: normalize(30), lineHeight: normalize(50) },
                ]}
              >
                Minutes
              </Text>
            </View>

            <View style={{ alignItems: "center" }}>
              <Text
                style={[
                  styles.timeValue,
                  { fontSize: normalize(50), lineHeight: normalize(70) },
                ]}
              >
                {calculated?.seconds}
              </Text>

              <Text
                style={[
                  styles.timeLabel,
                  { fontSize: normalize(30), lineHeight: normalize(50) },
                ]}
              >
                Seconds
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.timeDisplay, { justifyContent: "center" }]}>
            <Text
              style={[
                styles.timeValue,
                {
                  fontSize: normalize(25),
                  textDecorationLine: "line-through",
                  lineHeight: normalize(40),
                },
              ]}
            >
              {name.substring(0, 20)}
            </Text>
            <Text
              style={[
                styles.timeValue,
                { fontSize: normalize(50), lineHeight: normalize(70) },
              ]}
            >
              Completed
            </Text>
            <Text
              style={[
                styles.timeValue,
                { fontSize: normalize(35), lineHeight: normalize(50) },
              ]}
            >
              {formattedCreatedAt}
            </Text>
            <Text
              style={[
                styles.timeValue,
                { fontSize: normalize(35), lineHeight: normalize(50) },
              ]}
            >
              {formattedTime}
            </Text>
          </View>
        )}

        {type === "countup" && (
          <>
            <TouchableOpacity onPress={() => setIsVisible(true)}>
              <View style={styles.btnTxtWrapper}>
                <Icon source="pencil" size={normalize(18)} color="#000" />
                <Text
                  style={[styles.gradientText, { fontSize: normalize(15) }]}
                >
                  EDIT
                </Text>
              </View>
            </TouchableOpacity>
            <EditModal
              type={type}
              isVisible={isVisible}
              onClose={() => setIsVisible(false)}
              id={id}
              cName={name}
              cDate={formattedCreatedAt}
            />
          </>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    // Added for font loading state
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF96A3", // Match your gradient background for a smoother transition
  },
  topContainer: {
    justifyContent: "center",
    alignItems: "center",
    // height: 60, // Removed fixed height
    marginTop: 20,
    marginBottom: 10, // Added margin bottom for spacing
  },
  addgradient: {
    flex: 1, // Changed from height: "97%" to flex: 1
    width: "100%",
    alignItems: "center",
    paddingVertical: 10, // Added padding
  },
  gradientText: {
    color: "black",
    fontFamily: "bung-ee", // Example of applying a specific font
    // fontSize: 20, // Removed fixed fontSize
    // lineHeight: 40, // Removed fixed lineHeight
  },
  timeDisplay: {
    flex: 1,
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "space-evenly", // Changed from center to space-evenly for better distribution
    // justifyContent: "flex-start",
    // maxHeight: 500,
  },

  timeValue: {
    fontFamily: "bung-ee", // This is where the custom font is applied
    color: "black",
    // lineHeight: 110, // Removed fixed lineHeight
  },
  timeLabel: {
    // fontSize: 30, // Removed fixed fontSize
    color: "black",
    textAlign: "center",
    fontFamily: "bung-ee",
    // lineHeight: 50, // Removed fixed lineHeight
  },
  btnTxtWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 102,
    minHeight: 50,
    borderRadius: 20,
    borderWidth: 2,
    gap: 2,
  },
});
