import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Button, Icon, TextInput } from "react-native-paper";

import FancyDatePicker from "@/components/FancyDatePicker";
import { useCounterContext } from "@/context/counterContext";
import { CounterType, Recurrence } from "@/types/counter";
import { getMonthAsNum } from "@/types/date";
import { useNavigation } from "expo-router"; // Import useNavigation from expo-router
import {
  Directions,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Define props for this screen (if you need to pass data)
// For now, let's assume state management for new counter is internal or via context

export default function AddModalScreen() {
  const navigation = useNavigation(); // Use useNavigation hook
  const { width, height } = useWindowDimensions();

  const scale = Math.min(width / 375, height / 812);
  const normalize = (size: number) => Math.round(size * scale);

  const BUTTON_WIDTH = normalize(135); // Slightly smaller for elegance
  const BUTTON_GAP = normalize(70); // Closer gap
  const LEFT_POSITION = 0;
  const RIGHT_POSITION = BUTTON_WIDTH + BUTTON_GAP;
  const TOP_BAR_WIDTH = BUTTON_WIDTH * 2 + BUTTON_GAP;

  const [newCounterName, setNewCounterName] = useState<string>("");
  const [type, setType] = useState<"countup" | "countdown">("countup"); // Default type
  const [date, setDate] = useState<Date>(new Date());
  const [error, setError] = useState<string>("");
  const [showTimeExpanded, setShowTimeExpanded] = useState<boolean>(false);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [customDays, setCustomDays] = useState<string>("");
  const [showRecurrencePicker, setShowRecurrencePicker] =
    useState<boolean>(false);

  const { addCounter } = useCounterContext();

  // Shared value for the slider's translateX position
  const sliderTranslateX = useSharedValue(LEFT_POSITION);

  useEffect(() => {
    if (type === "countup") {
      sliderTranslateX.value = withTiming(LEFT_POSITION, {
        duration: 200,
        easing: Easing.linear,
      });
    } else {
      sliderTranslateX.value = withTiming(RIGHT_POSITION, {
        duration: 200,
        easing: Easing.linear,
      });
    }
  }, [type, LEFT_POSITION, RIGHT_POSITION]);

  const applyType = useCallback((nextType: CounterType) => {
    setDate((prev) => {
      const current = new Date();
      if (
        nextType === CounterType.COUNTUP &&
        prev.getTime() > current.getTime()
      ) {
        return current;
      }
      if (
        nextType === CounterType.COUNTDOWN &&
        prev.getTime() < current.getTime()
      ) {
        return current;
      }
      return prev;
    });
    setType(nextType);
  }, []);

  const flingRightGesture = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onStart(() => {
      runOnJS(applyType)(CounterType.COUNTUP);
    });

  const flingLeftGesture = Gesture.Fling()
    .direction(Directions.LEFT)
    .onStart(() => {
      runOnJS(applyType)(CounterType.COUNTDOWN);
    });

  const animatedSliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: sliderTranslateX.value }],
    };
  });

  const onDateChange = useCallback(
    (date: {
      day: string;
      month: string;
      year: string;
      hour?: string;
      minute?: string;
      ampm?: string;
    }) => {
      setError(""); // Clear error on date change
      const { day, month, year, hour, minute, ampm } = date;

      let monthNum;
      if (typeof month !== "number") {
        monthNum = getMonthAsNum(month);
      } else {
        monthNum = parseInt(month);
      }

      // Convert 12-hour to 24-hour format
      let hours24 = parseInt(hour || "12");
      if (ampm === "PM" && hours24 !== 12) {
        hours24 += 12;
      } else if (ampm === "AM" && hours24 === 12) {
        hours24 = 0;
      }

      const dateSelected = new Date(
        parseInt(year),
        monthNum!,
        parseInt(day),
        hours24,
        parseInt(minute || "0"),
      );
      setDate(dateSelected);
      // console.log("setDate:", dateSelected);
    },
    [],
  );

  const handleAddCounter = () => {
    if (!newCounterName.trim()) {
      // This now catches "", " ", "   ", "\t\n", etc.
      setError("Please enter a name for your counter."); // Using alert() as you indicated
      return;
    }
    if (type === CounterType.COUNTDOWN && date < new Date()) {
      setError("Please select a future date for the countdown.");
      return;
    }

    if (type === CounterType.COUNTUP && date > new Date()) {
      setError("Please select a Past date for the countup.");
      return;
    }

    addCounter({
      name: newCounterName.trim(),

      createdAt: date ? date.getTime() : Date.now(),
      type: type,
      recurrence: type === "countdown" ? recurrence : "none",
      customRecurrenceDays:
        type === "countdown" && recurrence === "custom"
          ? parseInt(customDays) || undefined
          : undefined,
    });
    // After adding, dismiss the modal
    navigation.goBack();
  };

  const onClose = useCallback(() => {
    setDate(new Date());
    navigation.goBack(); // Dismiss the modal using navigation
  }, [navigation]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose(); // Call your onClose logic
        return true; // Prevent default back button behavior
      },
    );
    return () => backHandler.remove();
  }, [onClose]);

  return (
    <LinearGradient
      colors={
        type === "countdown" ? ["#a9a9a9", "#4285F4"] : ["#FEC9CE", "#FF96A1"]
      }
      start={{ x: -1, y: 1 }}
      end={{ x: 1, y: 1 }}
      // Apply modal styles here directly to the content wrapper
      style={[styles.addgradient, styles.modalContentWrapper]} // Add modalContentWrapper
    >
      {/* Back Button */}
      <TouchableOpacity
        onPress={onClose}
        style={{
          position: "absolute",
          top: normalize(25),
          left: normalize(10),
          zIndex: 10,
          flexDirection: "row",
          alignItems: "center",
          padding: normalize(8),
        }}
      >
        <Icon
          source="arrow-left"
          size={normalize(24)}
          color={type === "countdown" ? "#e0e0e0" : "#000"}
        />
      </TouchableOpacity>
      <GestureDetector
        gesture={Gesture.Simultaneous(flingRightGesture, flingLeftGesture)}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.innerContentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[
              styles.modalTitle,
              {
                color: type === "countdown" ? "#e0e0e0" : "#000",
                marginBottom: normalize(30),
                fontSize: normalize(30),
              },
            ]}
          >
            Add Counter
          </Text>
          <View
            style={{
              backgroundColor: "#e5e5e560",
              alignItems: "center",
              justifyContent: "center",
              padding: 5,
              borderRadius: 15,
              margin: 10,
              // width: "100%",
            }}
          >
            <View
              style={[
                styles.topBarContainer,
                { width: TOP_BAR_WIDTH, gap: BUTTON_GAP },
              ]}
            >
              <Animated.View
                style={[
                  styles.sliderBackground,
                  animatedSliderStyle,
                  { width: BUTTON_WIDTH },
                ]}
              />

              <Button
                labelStyle={[
                  styles.buttonLabel,
                  {
                    fontSize: normalize(16),
                    // fontWeight: "bold",
                    textAlignVertical: "center",
                  },
                ]}
                onPress={() => applyType(CounterType.COUNTUP)}
                style={[styles.transparentButton, { width: BUTTON_WIDTH }]}
              >
                Countup
              </Button>

              <Button
                labelStyle={[
                  styles.buttonLabel,
                  {
                    fontSize: normalize(16),
                    // fontWeight: "bold",
                    //  fontFamily: "bungee",
                  },
                ]}
                onPress={() => applyType(CounterType.COUNTDOWN)}
                style={[styles.transparentButton, { width: BUTTON_WIDTH }]}
              >
                Countdown
              </Button>
            </View>
          </View>
          <View style={{ alignSelf: "flex-start" }}>
            <Text
              style={{
                textAlign: "left",
                fontFamily: "bungee",
                fontSize: normalize(16),
              }}
            >
              Counter Name
            </Text>
          </View>
          <TextInput
            placeholder={
              type === CounterType.COUNTDOWN ? "Birthday" : "Last Meeting"
            }
            placeholderTextColor="#626262cb"
            textColor="#000"
            onChangeText={setNewCounterName}
            // underlineColor="#000"
            // activeUnderlineColor="#000"
            mode="outlined"
            activeOutlineColor="#000"
            outlineColor="#000"
            outlineStyle={{
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: 15,
            }}
            style={[
              styles.modalInput,
              {
                width: "100%",
                backgroundColor: "#e5e5e560",
                fontSize: normalize(14),
              },
            ]}
          />
          {error.trim().length > 0 && (
            <Text
              style={{
                fontSize: normalize(10),
                color: "red",
                textAlign: "center",
                fontWeight: "bold",
                marginBottom: normalize(10),
              }}
            >
              {error}
            </Text>
          )}

          <View style={{ alignSelf: "flex-start" }}>
            <Text
              style={{
                textAlign: "left",
                fontFamily: "bungee",
                fontSize: normalize(16),
              }}
            >
              Date & Time
            </Text>
          </View>
          <FancyDatePicker
            onDateChange={onDateChange}
            showTime={showTimeExpanded}
          />

          {/* Time toggle button */}
          <TouchableOpacity
            onPress={() => setShowTimeExpanded(!showTimeExpanded)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: normalize(8),
              paddingHorizontal: normalize(16),
              marginTop: normalize(8),
              backgroundColor: "#e5e5e560",
              borderRadius: 15,
            }}
          >
            <Icon
              source={showTimeExpanded ? "chevron-up" : "clock-outline"}
              size={normalize(20)}
              color="#000"
            />
            <Text
              style={{
                marginLeft: normalize(8),
                fontSize: normalize(10),
                color: "#000",
                // fontWeight: "500",
                fontFamily: "bungee",
              }}
            >
              {showTimeExpanded ? "Hide Time" : "Add Time"}
            </Text>
          </TouchableOpacity>
          {/* </View> */}

          {/* Recurrence Picker - only show for countdown */}
          {type === "countdown" && (
            <View style={{ width: "100%", marginTop: normalize(12) }}>
              {/* Trigger Button */}
              <TouchableOpacity
                onPress={() => setShowRecurrencePicker(!showRecurrencePicker)}
                style={[
                  styles.recurrenceTrigger,
                  recurrence !== "none" && styles.recurrenceTriggerActive,
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={[
                      styles.recurrenceTriggerIcon,
                      recurrence !== "none" &&
                        styles.recurrenceTriggerIconActive,
                    ]}
                  >
                    <Icon
                      source="repeat"
                      size={normalize(16)}
                      color={recurrence !== "none" ? "#fff" : "#666"}
                    />
                  </View>
                  <View style={{ marginLeft: normalize(12), flex: 1 }}>
                    <Text
                      style={[
                        styles.recurrenceTriggerLabel,
                        { fontSize: normalize(9) },
                      ]}
                    >
                      REPEATS
                    </Text>
                    <Text
                      style={[
                        styles.recurrenceTriggerValue,
                        { fontSize: normalize(13) },
                      ]}
                    >
                      {recurrence === "none"
                        ? "Does not repeat"
                        : recurrence === "custom"
                          ? `Every ${customDays || "X"} days`
                          : recurrence.charAt(0).toUpperCase() +
                            recurrence.slice(1)}
                    </Text>
                  </View>
                </View>
                <Icon
                  source={showRecurrencePicker ? "chevron-up" : "chevron-down"}
                  size={normalize(20)}
                  color={recurrence !== "none" ? "#fff" : "#666"}
                />
              </TouchableOpacity>

              {/* Options Panel */}
              {showRecurrencePicker && (
                <View style={styles.recurrencePanel}>
                  {(
                    [
                      "none",
                      "daily",
                      "weekly",
                      "monthly",
                      "yearly",
                      "custom",
                    ] as Recurrence[]
                  ).map((option) => {
                    const icons: Record<Recurrence, string> = {
                      none: "close-circle-outline",
                      daily: "calendar-today",
                      weekly: "calendar-week",
                      monthly: "calendar-month",
                      yearly: "cake-variant",
                      custom: "calendar-edit",
                    };
                    const labels: Record<Recurrence, string> = {
                      none: "Does not repeat",
                      daily: "Daily",
                      weekly: "Weekly",
                      monthly: "Monthly",
                      yearly: "Yearly",
                      custom: "Custom",
                    };
                    const descriptions: Record<Recurrence, string> = {
                      none: "One-time event",
                      daily: "Every day",
                      weekly: "Every 7 days",
                      monthly: "Every month",
                      yearly: "Every year",
                      custom: "Set custom interval",
                    };
                    const isSelected = recurrence === option;

                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => {
                          setRecurrence(option);
                          if (option !== "custom") {
                            setShowRecurrencePicker(false);
                          }
                        }}
                        style={[
                          styles.recurrenceOptionModern,
                          isSelected && styles.recurrenceOptionModernActive,
                        ]}
                      >
                        <View
                          style={[
                            styles.recurrenceOptionIconWrapper,
                            isSelected &&
                              styles.recurrenceOptionIconWrapperActive,
                          ]}
                        >
                          <Icon
                            source={icons[option]}
                            size={normalize(18)}
                            color={isSelected ? "#fff" : "#666"}
                          />
                        </View>
                        <View style={{ marginLeft: normalize(12), flex: 1 }}>
                          <Text
                            style={[
                              styles.recurrenceOptionLabelModern,
                              { fontSize: normalize(13) },
                              isSelected &&
                                styles.recurrenceOptionLabelModernActive,
                            ]}
                          >
                            {labels[option]}
                          </Text>
                          <Text
                            style={[
                              styles.recurrenceOptionDescModern,
                              { fontSize: normalize(9) },
                              isSelected &&
                                styles.recurrenceOptionDescModernActive,
                            ]}
                          >
                            {descriptions[option]}
                          </Text>
                        </View>
                        {isSelected && (
                          <Icon
                            source="check"
                            size={normalize(18)}
                            color="#fff"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Custom days input */}
                  {recurrence === "custom" && (
                    <View style={styles.customDaysRowModern}>
                      <Text
                        style={[
                          styles.customDaysLabel,
                          { fontSize: normalize(12) },
                        ]}
                      >
                        Repeat every
                      </Text>
                      <TextInput
                        placeholder="14"
                        placeholderTextColor="#999"
                        textColor="#000"
                        keyboardType="numeric"
                        value={customDays}
                        onChangeText={setCustomDays}
                        mode="outlined"
                        activeOutlineColor="#4285F4"
                        outlineColor="#ddd"
                        outlineStyle={{
                          borderWidth: 1.5,
                          borderRadius: 12,
                        }}
                        style={styles.customDaysInput}
                      />
                      <Text
                        style={[
                          styles.customDaysLabel,
                          { fontSize: normalize(12) },
                        ]}
                      >
                        days
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={[styles.modalButtonRow, { marginTop: normalize(35) }]}>
            <Button
              mode="elevated"
              onPress={handleAddCounter}
              style={[
                styles.modalButton,
                {
                  backgroundColor: "#E0E0E0",
                  minWidth: normalize(250),
                },
              ]}
              labelStyle={{
                color: "#000",
                fontSize: normalize(15),
                fontFamily: "bungee",
              }}
            >
              Add Counter
            </Button>
          </View>
          {/* <Link
            href={"https://www.github.com//roshan669"}
            style={{
              // fontWeight: "bold",
              position: "absolute",
              bottom: -20,
              // left: 120,
              // textAlign: "center",
              alignSelf: "center",
            }}
          >
            <Icon source={"github"} size={30} />
          </Link> */}
        </ScrollView>
      </GestureDetector>
    </LinearGradient>
  );
}

export const styles = StyleSheet.create({
  addgradient: {
    flex: 1, // Will expand to fill the available space provided by `modalContentWrapper`
    justifyContent: "center",
    width: "100%", // Will take 100% of `modalContentWrapper`'s width
    padding: 20,
    gap: 15,
    // alignItems: "center",
  },
  modalContentWrapper: {
    flex: 1, // This outer wrapper expands to fill the entire screen, allowing for centering
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
    paddingVertical: 20,
  },
  modalScroll: {
    flex: 1,
    width: "100%",
  },
  innerContentContainer: {
    // This is now your actual modal content, without the gradient
    flexGrow: 1, // Keep short content centered while allowing overflow to scroll
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 60,
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: "center",
    fontFamily: "bungee",
    fontSize: 15,
  },
  modalInput: { marginBottom: 5, borderRadius: 50 },
  modalButtonRow: {
    // flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
    // gap: 60, // Handled inline
  },
  modalButton: {
    // minWidth: 110, // Handled inline

    borderRadius: 15,
  },
  spinner: {
    flexDirection: "row",
  },
  buttonLabel: {
    color: "#000",
    fontSize: 15,
    fontFamily: "bungee",
  },
  topBarContainer: {
    flexDirection: "row",
    // width: TOP_BAR_WIDTH, // Handled inline
    verticalAlign: "middle",

    justifyContent: "center",
    alignItems: "center",
    // marginBottom: 25,

    borderRadius: 15,
    position: "relative",
    // alignSelf: "center",
  },
  sliderBackground: {
    position: "absolute",
    height: "100%",
    // width: BUTTON_WIDTH, // Handled inline
    backgroundColor: "#E0E0E0",
    borderRadius: 15,
    left: 0,
    top: 0,
    elevation: 2,
  },
  transparentButton: {
    backgroundColor: "transparent",
  },
  selectedDateText: {
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Roboto-Bold",
  },
  recurrenceTrigger: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  recurrenceTriggerActive: {
    backgroundColor: "#4285F4",
    borderColor: "#4285F4",
  },
  recurrenceTriggerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  recurrenceTriggerIconActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  recurrenceTriggerLabel: {
    fontFamily: "Roboto-Regular",
    color: "#666",
    fontSize: 10,
    marginBottom: 2,
  },
  recurrenceTriggerValue: {
    fontFamily: "Roboto-Bold",
    color: "#000",
    fontSize: 14,
  },
  recurrencePanel: {
    marginTop: 8,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    padding: 8,
  },
  recurrenceOptionModern: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  recurrenceOptionModernActive: {
    backgroundColor: "#4285F4",
  },
  recurrenceOptionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  recurrenceOptionIconWrapperActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  recurrenceOptionLabelModern: {
    fontFamily: "Roboto-Bold",
    color: "#000",
    fontSize: 13,
  },
  recurrenceOptionLabelModernActive: {
    color: "#fff",
  },
  recurrenceOptionDescModern: {
    fontFamily: "Roboto-Regular",
    color: "#666",
    fontSize: 10,
    marginTop: 2,
  },
  recurrenceOptionDescModernActive: {
    color: "rgba(255, 255, 255, 0.85)",
  },
  customDaysRowModern: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
    marginTop: 8,
  },
  customDaysLabel: {
    fontFamily: "Roboto-Regular",
    color: "#000",
  },
  customDaysInput: {
    width: 60,
    height: 36,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
});
