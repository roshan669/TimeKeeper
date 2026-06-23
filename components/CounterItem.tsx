import { Counter } from "@/types/counter";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type CounterItemProps = {
  item: Counter;
  handleDeleteCounter: (id: string) => void;
  handleArchiveToggle: (id: string) => void;
  handleComplete: (id: string) => void;
};

const getTimeParts = (item: Counter) => {
  const now = Date.now();
  const diff =
    item.type === "countdown"
      ? Math.max(0, item.createdAt - now)
      : Math.max(0, now - item.createdAt);

  const totalSeconds = Math.floor(diff / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  if (totalDays > 0) {
    return {
      value: String(totalDays),
      label:
        item.type === "countdown"
          ? totalDays === 1
            ? "day to"
            : "days to"
          : totalDays === 1
            ? "day since"
            : "days since",
    };
  }

  if (totalHours > 0) {
    return {
      value: String(totalHours),
      label: item.type === "countdown" ? "hours to" : "hours since",
    };
  }

  if (totalMinutes > 0) {
    return {
      value: String(totalMinutes),
      label: item.type === "countdown" ? "minutes to" : "minutes since",
    };
  }

  return {
    value: String(totalSeconds),
    label: item.type === "countdown" ? "seconds to" : "seconds since",
  };
};

function CounterItem({
  item,
  handleDeleteCounter,
  handleArchiveToggle,
  handleComplete,
}: CounterItemProps) {
  const router = useRouter();
  const { value, label } = getTimeParts(item);

  const formattedDate = useMemo(
    () =>
      new Date(item.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [item.createdAt],
  );

  const gradientColors =
    item.type === "countdown"
      ? (["#E0E0E0", "#4285F4"] as const)
      : (["#FEC9CE", "#FF96A1"] as const);

  const openDetails = () => {
    router.push({
      pathname: "/details",
      params: {
        id: item.id,
        name: item.name,
        creation: String(item.createdAt),
        type: item.type,
        completed: String(item.completed),
      },
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={openDetails}
      style={styles.cardContainer}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 1, y: 1 }}
        end={{ x: 0.4, y: 0.5 }}
        style={styles.gradient}
      >
        <View style={styles.cardContent}>
          <View style={styles.leftColumn}>
            <Text
              style={[
                styles.valueText,
                value.length > 3 && styles.compactValueText,
              ]}
              numberOfLines={1}
            >
              {value}
            </Text>
            <Text style={styles.labelText}>{label}</Text>
          </View>

          <View style={styles.rightColumn}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Text style={styles.nameText} numberOfLines={2}>
              {item.name}
            </Text>
          </View>

          {item.hasNotification && (
            <Ionicons
              name="notifications"
              size={18}
              color="#000"
              style={styles.notificationIcon}
            />
          )}

          <TouchableOpacity
            accessibilityLabel="Delete counter"
            onPress={() => handleDeleteCounter(item.id)}
            style={styles.deleteIcon}
          >
            <Ionicons name="trash-outline" size={20} color="#000" />
          </TouchableOpacity>

          {!item.completed && item.type === "countdown" && (
            <TouchableOpacity
              accessibilityLabel="Complete counter"
              onPress={() => handleComplete(item.id)}
              style={styles.completeIcon}
            >
              <Ionicons name="checkmark-circle-outline" size={21} color="#000" />
            </TouchableOpacity>
          )}

          {!item.completed && (
            <TouchableOpacity
              accessibilityLabel={
                item.isArchived ? "Move counter to current" : "Archive counter"
              }
              onPress={() => handleArchiveToggle(item.id)}
              style={styles.archiveIcon}
            >
              <Ionicons
                name={item.isArchived ? "archive" : "archive-outline"}
                size={20}
                color="#000"
              />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default memo(CounterItem);

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
    minHeight: 130,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 12,
    position: "relative",
  },
  leftColumn: {
    width: 138,
    alignItems: "center",
    justifyContent: "center",
  },
  rightColumn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingRight: 70,
  },
  valueText: {
    fontSize: 55,
    fontFamily: "bung-ee",
    color: "#000",
    lineHeight: 68,
    textAlign: "center",
  },
  compactValueText: {
    fontSize: 42,
  },
  labelText: {
    fontSize: 10,
    fontFamily: "my-font",
    color: "#333",
    fontWeight: "900",
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
    lineHeight: 24,
  },
  notificationIcon: {
    position: "absolute",
    top: 8,
    right: 90,
  },
  deleteIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 6,
  },
  completeIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    padding: 6,
  },
  archiveIcon: {
    position: "absolute",
    top: 8,
    right: 42,
    padding: 6,
  },
});
