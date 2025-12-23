import { useTick } from "@/context/TickContext";
import { Counter } from "@/types/counter";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { memo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IconButton, useTheme } from "react-native-paper";

type CounterItemProps = {
  item: Counter;
  handleDeleteCounter: (id: string) => void;
  handleArchiveToggle: (id: string) => void;
  handleComplete: (id: string) => void;
};

const CounterItem = ({
  item,
  handleDeleteCounter,
  handleArchiveToggle,
  handleComplete,
}: CounterItemProps) => {
  const theme = useTheme();
  const router = useRouter();
  const tick = useTick(); // Subscribe to tick to force re-render

  const calculateCountup = (elapsedMs: number, baseStyle: StyleProp<any>) => {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);

    let displayValue: string | number;
    let displayLabel: string;
    let isDaysView = false;

    if (totalDays > 0) {
      displayValue = totalDays;
      displayLabel = totalDays === 1 ? "DAY SINCE" : "DAYS SINCE";
      isDaysView = true;
      baseStyle = styles.daysNumber;
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

    return {
      displayLabel,
      displayValue,
      isDaysView,
      remainingSeconds: 1, // Placeholder for countup
    };
  };

  const calculateCountdown = (
    forthcommingMs: number,
    baseStyle: StyleProp<any>
  ) => {
    const remainingSeconds = Math.floor(forthcommingMs / 1000);
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingDays = Math.floor(remainingHours / 24);

    let displayValue: string | number;
    let displayLabel: string;
    let isDaysView = false;

    if (remainingDays > 0) {
      displayValue = remainingDays;
      displayLabel = remainingDays === 1 ? "DAY TO" : "DAYS TO";
      isDaysView = true;
      baseStyle = styles.daysNumber;
    } else if (remainingHours >= 1) {
      displayValue = remainingHours;
      displayLabel = "HOURS TO";
    } else if (remainingMinutes >= 1) {
      displayValue = remainingMinutes;
      displayLabel = "MINUTES TO";
    } else {
      displayValue = remainingSeconds;
      displayLabel = "SECONDS TO";
    }

    return {
      displayLabel,
      displayValue,
      isDaysView,
      remainingSeconds,
    };
  };

  const now = Date.now();
  const elapsedMs = Math.max(0, now - item.createdAt);
  const forthcommingMs = Math.max(0, item.createdAt - now);

  let baseStyle = styles.hoursMinutesSecondsNumber; // Default to H/M/S style

  const { displayLabel, displayValue, isDaysView, remainingSeconds } =
    item.type === "countdown"
      ? calculateCountdown(forthcommingMs, baseStyle)
      : calculateCountup(elapsedMs, baseStyle);

  const formattedDate = format(new Date(item.createdAt), "MMM dd, yyyy");

  if (item.type === "countdown" && remainingSeconds <= 0 && !item.completed) {
    setTimeout(() => {
      handleComplete(item.id);
    }, 0);
  }

  return (
    <TouchableOpacity
      onPress={() => {
        router.push({
          pathname: "/details",
          params: {
            creation: item.createdAt.toString(),
            name: item.name,
            id: item.id.toString(),
            type: item.type.toString(),
            completed: item.completed.toString(),
          },
        });
      }}
      onLongPress={() => handleArchiveToggle(item.id)}
      delayLongPress={1000}
    >
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={
            item.type === "countdown"
              ? ["#E0E0E0", "#4285F4"]
              : ["#FEC9CE", "#FF96A1"]
          }
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.gradient}
        >
          {!item.completed ? (
            <View style={styles.cardContent}>
              {/* Left Side */}
              <View style={styles.leftColumn}>
                <Text
                  style={[baseStyle]}
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
          ) : (
            <View
              style={[
                styles.cardContent,
                {
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  maxHeight: 120,
                  paddingVertical: 0,
                },
              ]}
            >
              <Text
                style={[
                  styles.hoursMinutesSecondsNumber,
                  {
                    fontSize: 40,
                    lineHeight: 50,
                    textDecorationLine: "line-through",
                  },
                ]}
              >
                {item.name.substring(0, 10)}
              </Text>
              <IconButton
                icon="delete-outline"
                size={20}
                onPress={() => handleDeleteCounter(item.id)}
                iconColor={theme.colors.onPrimary}
                style={styles.deleteIcon}
              />
              <Text
                style={[styles.hoursMinutesSecondsNumber, { fontSize: 30 }]}
              >
                completed
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 7,
    borderRadius: 18,
  },
  gradient: {
    borderRadius: 18,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    position: "relative",
  },
  leftColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 145,
  },
  rightColumn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "baseline",
    marginBottom: 30,
  },
  daysNumber: {
    fontSize: 55,
    fontFamily: "bung-ee",
    color: "#000",
    lineHeight: 70,
    textAlign: "center",
  },
  hoursMinutesSecondsNumber: {
    fontSize: 55,
    fontFamily: "bung-ee",
    color: "#111",
    lineHeight: 70,
    textAlign: "center",
  },
  daysLabel: {
    fontSize: 10,
    fontFamily: "my-font",
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
    right: 35,
    zIndex: 1,
  },
  deleteIcon: {
    position: "absolute",
    top: 5,
    right: 5,
    zIndex: 1,
  },
});

export default memo(CounterItem);
