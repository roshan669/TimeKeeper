import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Icon, useTheme } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useFonts } from "expo-font";
import { Pressable } from "react-native-gesture-handler";
import EditModal from "@/components/edit.modal";

export interface data {
  hours: string;
  days: string;
  minutes: string;
  seconds: string;
}

export default function Details() {
  const [fontsLoaded] = useFonts({
    // Renamed 'loaded' to 'fontsLoaded' for clarity
    "Roboto-Regular": require("@/assets/fonts/roboto.ttf"),
    "Roboto-Bold": require("@/assets/fonts/boldonse.ttf"), // Double-check this path and internal font name
    "my-font": require("@/assets/fonts/myfont.ttf"), // Double-check this path and internal font name
    "bung-ee": require("@/assets/fonts/bungee.ttf"), // Double-check this path and internal font name
  });

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

  type === "countup"
    ? useEffect(() => {
        //  Perform initial calculation immediately

        calculationsCountup(createdAt);

        // Then set up the interval for subsequent updates
        intervalRef.current = setInterval(() => {
          calculationsCountup(createdAt);
        }, 1000);

        // Clean up the interval when the component unmounts
        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        };
      }, [createdAt, calculationsCountup])
    : useEffect(() => {
        //  Perform initial calculation immediately

        calculationsCountdown(createdAt);

        // Then set up the interval for subsequent updates
        intervalRef.current = setInterval(() => {
          calculationsCountdown(createdAt);
        }, 1000);

        // Clean up the interval when the component unmounts
        return () => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        };
      }, [createdAt, calculationsCountdown]);

  const createdAtDate = new Date(createdAt);

  const formattedCreatedAt = createdAtDate.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
            <Text style={styles.gradientText}>
              {type === "countup" && "Since"} {formattedCreatedAt}
            </Text>
            <Text style={[styles.gradientText, { fontSize: 20 }]}>
              {name.substring(0, 20)}
            </Text>
          </View>
        )}

        {type === "countup" || completed === "false" ? (
          <View style={styles.timeDisplay}>
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.timeValue, { fontSize: 60 }]}>
                {calculated?.days}
              </Text>

              <Text style={styles.timeLabel}>Days</Text>
            </View>

            <View style={{ alignItems: "center" }}>
              <Text style={[styles.timeValue, { fontSize: 55 }]}>
                {calculated?.hours}
              </Text>
              <Text style={styles.timeLabel}>Hours</Text>
            </View>

            <View style={{ alignItems: "center" }}>
              <Text style={[styles.timeValue, { fontSize: 50 }]}>
                {calculated?.minutes}
              </Text>

              <Text style={styles.timeLabel}>Minutes</Text>
            </View>

            <View style={{ alignItems: "center" }}>
              <Text style={[styles.timeValue, { fontSize: 45 }]}>
                {calculated?.seconds}
              </Text>

              <Text style={styles.timeLabel}>Seconds</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.timeDisplay, { justifyContent: "center" }]}>
            <Text
              style={[
                styles.timeValue,
                { fontSize: 25, textDecorationLine: "line-through" },
              ]}
            >
              {name}
            </Text>
            <Text style={[styles.timeValue, { fontSize: 50 }]}>Completed</Text>
            <Text style={[styles.timeValue, { fontSize: 50 }]}>
              {formattedCreatedAt}
            </Text>
          </View>
        )}

        {type === "countup" && (
          <>
            <TouchableOpacity onPress={() => setIsVisible(true)}>
              <View style={styles.btnTxtWrapper}>
                <Icon source="pencil" size={18} color="#000" />
                <Text style={styles.gradientText}>EDIT</Text>
              </View>
            </TouchableOpacity>
            <EditModal
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
    height: 60,
    marginTop: 20,
  },
  addgradient: {
    height: "97%",
    width: "100%",
    alignItems: "center",
  },
  gradientText: {
    color: "black",
    fontFamily: "Roboto-Regular", // Example of applying a specific font
    fontWeight: "bold",
  },
  timeDisplay: {
    flex: 1,
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "flex-start",
  },

  timeValue: {
    fontFamily: "bung-ee", // This is where the custom font is applied
    color: "black",
    height: 100,
  },
  timeLabel: {
    fontSize: 20,
    color: "black",
    textAlign: "center",
    // fontWeight: "100",
    fontFamily: "bung-ee", // Example of applying a specific font
    height: 40,
  },
  btnTxtWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    // padding: 10,
    // elevation: 2,
    width: 102,
    height: 50,
    borderRadius: 15,
    borderWidth: 2,
    gap: 1,
  },
});
