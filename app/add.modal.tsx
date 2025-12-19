import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { Button, Icon, TextInput } from "react-native-paper";

import { useCounterContext } from "@/context/counterContext";
import { CounterType } from "@/types/counter";
import { useNavigation } from "expo-router"; // Import useNavigation from expo-router
import DatePicker from "react-native-date-picker";
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

const BUTTON_WIDTH = 140;
const BUTTON_GAP = 50;
const LEFT_POSITION = 0;
const RIGHT_POSITION = BUTTON_WIDTH + BUTTON_GAP;
const TOP_BAR_WIDTH = BUTTON_WIDTH * 2 + BUTTON_GAP;
const FAR_PAST = new Date(Date.UTC(1970, 0, 1));
const FAR_FUTURE = new Date(Date.UTC(2100, 0, 1));

export default function AddModalScreen() {
  const navigation = useNavigation(); // Use useNavigation hook

  const [newCounterName, setNewCounterName] = useState<string>("");
  const [type, setType] = useState<"countup" | "countdown">("countup"); // Default type
  const [date, setDate] = useState<Date>(new Date());
  const [error, setError] = useState<string>("");

  const { addCounter } = useCounterContext();

  const now = useMemo(() => new Date(), [type]);
  const minDate = type === CounterType.COUNTUP ? FAR_PAST : now;
  const maxDate = type === CounterType.COUNTUP ? now : FAR_FUTURE;

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
  }, [type]);

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

  const handleAddCounter = () => {
    if (!newCounterName.trim()) {
      // This now catches "", " ", "   ", "\t\n", etc.
      setError("Please enter a name for your counter."); // Using alert() as you indicated
      return;
    }
    if (type === CounterType.COUNTDOWN && date < new Date()) {
      setError("Please select a future date for the countdown counter.");
      return;
    }

    if (type === CounterType.COUNTUP && date > new Date()) {
      setError("Please select a Past date for the countup counter.");
      return;
    }

    addCounter({
      name: newCounterName.trim(),
      createdAt: date ? date.getTime() : Date.now(), // Use selected date or current time
      type: type,
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
      }
    );
    return () => backHandler.remove();
  }, [onClose]);

  return (
    <LinearGradient
      colors={
        type === "countdown" ? ["#E0E0E0", "#4285F4"] : ["#FFD9CE", "#FF76A3"]
      }
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 1 }}
      // Apply modal styles here directly to the content wrapper
      style={[styles.addgradient, styles.modalContentWrapper]} // Add modalContentWrapper
    >
      <View style={{ marginTop: 100, marginBottom: 5 }}>
        <Icon source={"timer-sand-empty"} size={100} color={"#E0E0E0"} />
      </View>
      <GestureDetector
        gesture={Gesture.Simultaneous(flingRightGesture, flingLeftGesture)}
      >
        <View collapsable={false} style={styles.innerContentContainer}>
          <Text
            style={[
              styles.modalTitle,
              {
                color: type === "countdown" ? "#e0e0e0" : "#000",
                marginBottom: 30,
              },
            ]}
          >
            Add New Counter
          </Text>

          <View style={styles.topBarContainer}>
            <Animated.View
              style={[styles.sliderBackground, animatedSliderStyle]}
            />

            <Button
              labelStyle={[
                styles.buttonLabel,
                {
                  fontSize: type === "countup" ? 17 : 15,
                  fontWeight: type === "countup" ? "bold" : "900",
                  textAlignVertical: "center",
                },
              ]}
              onPress={() => applyType(CounterType.COUNTUP)}
              style={[styles.topbtn, styles.transparentButton]}
            >
              Countup
            </Button>

            <Button
              labelStyle={[
                styles.buttonLabel,
                {
                  fontSize: type === "countdown" ? 17 : 15,
                  fontWeight: type === "countdown" ? "bold" : "900",
                },
              ]}
              onPress={() => applyType(CounterType.COUNTDOWN)}
              style={[styles.topbtn, styles.transparentButton]}
            >
              Countdown
            </Button>
          </View>

          <TextInput
            placeholder="Set Name"
            placeholderTextColor="#000"
            textColor="#000"
            onChangeText={setNewCounterName}
            underlineColor="#000"
            activeUnderlineColor="#000"
            mode="outlined"
            activeOutlineColor="#d3d3d3ff"
            style={[styles.modalInput, { backgroundColor: "" }]}
            outlineStyle={{
              borderRadius: 20,
              borderWidth: StyleSheet.hairlineWidth,
            }}
          />
          {error.trim().length > 0 && (
            <Text
              style={{
                fontSize: 14,
                color: "red",
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          )}

          <DatePicker
            style={styles.spinner}
            mode="datetime"
            onDateChange={setDate}
            date={date}
            is24hourSource="locale"
          />

          <View style={styles.modalButtonRow}>
            <Button
              mode="elevated"
              onPress={onClose} // Use onClose to dismiss
              style={[
                styles.modalButton,
                {
                  backgroundColor: "#E0E0E0",
                },
              ]}
              labelStyle={styles.buttonLabel}
            >
              Cancel
            </Button>
            <Button
              mode="elevated"
              onPress={handleAddCounter}
              style={[
                styles.modalButton,
                {
                  backgroundColor: "#E0E0E0",
                },
              ]}
              labelStyle={styles.buttonLabel}
            >
              Add
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
        </View>
      </GestureDetector>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  addgradient: {
    flex: 1, // Will expand to fill the available space provided by `modalContentWrapper`
    justifyContent: "center",
    width: "100%", // Will take 100% of `modalContentWrapper`'s width
    borderRadius: 16,
    padding: 30,
    gap: 15,
  },
  modalContentWrapper: {
    flex: 1, // This outer wrapper expands to fill the entire screen, allowing for centering
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
    paddingVertical: 40,
  },
  innerContentContainer: {
    // This is now your actual modal content, without the gradient
    flex: 1, // Ensure it expands within the gradient
    // justifyContent: "center",
    width: "100%",
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: "center",
    fontFamily: "Roboto-Bold",
    fontSize: 15,
  },
  modalInput: { marginBottom: 5, borderRadius: 50 },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
    gap: 60,
  },
  modalButton: {
    minWidth: 110,
    borderRadius: 8,
  },
  spinner: {
    alignSelf: "center",
  },
  buttonLabel: {
    color: "#000",
    fontSize: 15,
  },
  topBarContainer: {
    flexDirection: "row",
    width: TOP_BAR_WIDTH,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    gap: BUTTON_GAP,
    position: "relative",
    alignSelf: "center",
  },
  sliderBackground: {
    position: "absolute",
    height: "100%",
    width: BUTTON_WIDTH,
    backgroundColor: "#E0E0E0",
    borderRadius: 15,
    left: 0,
    top: 0,
    elevation: 1,
  },
  topbtn: {
    width: BUTTON_WIDTH,
    // padding: 5,
    // borderRadius: 30,
    // zIndex: 1,
    // height: 50,
    // justifyContent: "center",
  },
  transparentButton: {
    backgroundColor: "transparent",
  },
  selectedDateText: {
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Roboto-Bold",
  },
});
