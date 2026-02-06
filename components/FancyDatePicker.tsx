import * as Haptics from "expo-haptics";
import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import Carousel, { ICarouselInstance } from "react-native-reanimated-carousel";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 3;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PICKER_WIDTH = SCREEN_WIDTH * 0.92;

// Calculated widths based on flex ratios (1.5 : 0.7 : 1)
const TOTAL_FLEX = 3.2;
const MONTH_WIDTH = (PICKER_WIDTH * 1.5) / TOTAL_FLEX;
const DAY_WIDTH = (PICKER_WIDTH * 0.7) / TOTAL_FLEX;
const YEAR_WIDTH = (PICKER_WIDTH * 1.0) / TOTAL_FLEX;

// Time picker widths
const TIME_PICKER_WIDTH = SCREEN_WIDTH * 0.6;
const TIME_SEPARATOR_WIDTH = 12;
const TIME_WHEEL_WIDTH = TIME_PICKER_WIDTH - TIME_SEPARATOR_WIDTH;
const TIME_TOTAL_FLEX = 3;
const HOUR_WIDTH = (TIME_WHEEL_WIDTH * 1) / TIME_TOTAL_FLEX;
const MINUTE_WIDTH = (TIME_WHEEL_WIDTH * 1) / TIME_TOTAL_FLEX;
const AMPM_WIDTH = (TIME_WHEEL_WIDTH * 1) / TIME_TOTAL_FLEX;

// Carousel wheel item
const WheelItem = memo(
  ({
    item,
    animationValue,
  }: {
    item: string;
    animationValue: SharedValue<number>;
  }) => {
    const animatedStyles = useAnimatedStyle(() => {
      // Fisheye scale - center is largest, edges shrink significantly
      const scale = interpolate(
        animationValue.value,
        [-3, -2, -1, 0, 1, 2, 3],
        [0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.25],
        Extrapolation.CLAMP,
      );
      // Opacity falloff for depth
      const opacity = interpolate(
        animationValue.value,
        [-2, -1, 0, 1, 2],
        [0.15, 0.4, 1, 0.4, 0.15],
        Extrapolation.CLAMP,
      );
      // 3D cylinder rotation effect
      const rotateX = interpolate(
        animationValue.value,
        [-1, 0, 1],
        [30, 0, -30],
        Extrapolation.CLAMP,
      );
      // Vertical displacement for curved surface
      const translateY = interpolate(
        animationValue.value,
        [-2, 0, 2],
        [6, 0, -6],
        Extrapolation.CLAMP,
      );
      return {
        transform: [
          { perspective: 500 },
          { rotateX: `${rotateX}deg` },
          { scale },
          { translateY },
        ],
        opacity,
      };
    });

    return (
      <Animated.View style={[styles.item, animatedStyles]}>
        <Text style={styles.itemText}>{item}</Text>
      </Animated.View>
    );
  },
);
WheelItem.displayName = "WheelItem";

// WheelPicker using reanimated-carousel
interface WheelPickerProps {
  data: string[];
  selectedIndex: number;
  onSelect: (value: string, index: number) => void;
  width: number;
  syncOnChange?: boolean;
}

const WheelPicker = React.forwardRef<ICarouselInstance, WheelPickerProps>(
  ({ data, selectedIndex, onSelect, width, syncOnChange = true }, ref) => {
    const carouselRef = useRef<ICarouselInstance>(null);
    const isScrolling = useRef(false);
    const shouldLoop = data.length > 2;
    const safeIndex = Math.max(0, Math.min(selectedIndex, data.length - 1));
    const isFirstRender = useRef(true);

    // Expose ref
    React.useImperativeHandle(ref, () => ({
      ...carouselRef.current!,
      scrollTo: carouselRef.current?.scrollTo,
    }));

    // Sync selectedIndex changes from parent (e.g. date clamping)
    useEffect(() => {
      if (!syncOnChange) {
        return;
      }
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      if (carouselRef.current && !isScrolling.current) {
        carouselRef.current.scrollTo({ index: safeIndex, animated: true });
      }
    }, [safeIndex, syncOnChange]);

    return (
      <View style={[styles.wheelContainer, { width }]}>
        <View style={styles.gradientTop} pointerEvents="none" />
        <Carousel
          ref={carouselRef}
          data={data}
          width={width}
          height={ITEM_HEIGHT}
          style={{
            width: width,
            height: PICKER_HEIGHT,
            justifyContent: "center",
            alignItems: "center",
          }}
          vertical
          loop={shouldLoop}
          windowSize={shouldLoop ? 5 : Math.max(1, data.length)}
          defaultIndex={safeIndex}
          pagingEnabled
          snapEnabled
          onScrollBegin={() => {
            isScrolling.current = true;
          }}
          onScrollEnd={(index) => {
            isScrolling.current = false;
          }}
          onSnapToItem={(index) => {
            if (data[index] !== undefined) {
              // Only trigger onSelect if index actually changed to avoid loop
              if (index !== selectedIndex) {
                onSelect(data[index], index);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }
            }
          }}
          renderItem={({ item, animationValue }) => (
            <WheelItem item={item} animationValue={animationValue} />
          )}
        />
        <View style={styles.gradientBottom} pointerEvents="none" />
      </View>
    );
  },
);
WheelPicker.displayName = "WheelPicker";

// Main DatePicker component
interface FancyDatePickerProps {
  onDateChange: (date: {
    day: string;
    month: string;
    year: string;
    hour: string;
    minute: string;
    ampm: string;
  }) => void;
  initialDate?: Date;
  showTime?: boolean;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const generateDays = () =>
  Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const generateYears = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
const generateHours = () =>
  Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const generateMinutes = () =>
  Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const AMPM = ["AM", "PM"];

export default function FancyDatePicker({
  onDateChange,
  initialDate,
  showTime = true,
}: FancyDatePickerProps) {
  const didInitRef = useRef(false);
  const days = useMemo(() => generateDays(), []);
  const years = useMemo(() => generateYears(1920, 2100), []);
  const hours = useMemo(() => generateHours(), []);
  const minutes = useMemo(() => generateMinutes(), []);

  const baseDate = useMemo(() => initialDate || new Date(), [initialDate]);
  const [selectedDay, setSelectedDay] = useState(baseDate.getDate() - 1);
  const [selectedMonth, setSelectedMonth] = useState(baseDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(
    years.indexOf(String(baseDate.getFullYear())),
  );

  // Time state
  const initialHour = baseDate.getHours();
  const [selectedHour, setSelectedHour] = useState(
    initialHour === 0
      ? 11
      : initialHour > 12
        ? initialHour - 13
        : initialHour - 1,
  );
  const [selectedMinute, setSelectedMinute] = useState(baseDate.getMinutes());
  const [selectedAmPm, setSelectedAmPm] = useState(initialHour >= 12 ? 1 : 0);

  const dayRef = useRef<any>(null);
  const monthRef = useRef<any>(null);
  const yearRef = useRef<any>(null);
  const hourRef = useRef<any>(null);
  const minuteRef = useRef<any>(null);
  const ampmRef = useRef<any>(null);

  // Sync state when initialDate changes
  useEffect(() => {
    if (!initialDate && !didInitRef.current) {
      didInitRef.current = true;
      return;
    }

    setSelectedDay(baseDate.getDate() - 1);
    setSelectedMonth(baseDate.getMonth());
    setSelectedYear(years.indexOf(String(baseDate.getFullYear())));

    const initialHour = baseDate.getHours();
    setSelectedHour(
      initialHour === 0
        ? 11
        : initialHour > 12
          ? initialHour - 13
          : initialHour - 1,
    );
    setSelectedMinute(baseDate.getMinutes());
    setSelectedAmPm(initialHour >= 12 ? 1 : 0);
  }, [initialDate, baseDate, years]);

  // Get max days for selected month/year
  const maxDays = useMemo(() => {
    const year = parseInt(
      years[selectedYear] || String(baseDate.getFullYear()),
    );
    const month = selectedMonth;
    return new Date(year, month + 1, 0).getDate();
  }, [selectedMonth, selectedYear, years, baseDate]);

  // Adjust day if it exceeds max days for the month
  useEffect(() => {
    if (selectedDay >= maxDays) {
      setSelectedDay(maxDays - 1);
    }
  }, [maxDays, selectedDay]);

  useEffect(() => {
    onDateChange({
      day: days[selectedDay] || "01",
      month: MONTHS[selectedMonth] || "January",
      year: years[selectedYear] || String(baseDate.getFullYear()),
      hour: hours[selectedHour] || "12",
      minute: minutes[selectedMinute] || "00",
      ampm: AMPM[selectedAmPm] || "AM",
    });
  }, [
    selectedDay,
    selectedMonth,
    selectedYear,
    selectedHour,
    selectedMinute,
    selectedAmPm,
    onDateChange,
  ]);

  const visibleDays = useMemo(() => days.slice(0, maxDays), [days, maxDays]);

  return (
    <View style={styles.container}>
      <View style={styles.pickerRow}>
        {/* Single unified selection highlight */}
        <View style={styles.selectionOverlay} pointerEvents="none">
          <View style={styles.selectionHighlight} />
        </View>
        <WheelPicker
          ref={monthRef}
          data={MONTHS}
          selectedIndex={selectedMonth}
          onSelect={(_, index) => setSelectedMonth(index)}
          width={MONTH_WIDTH}
        />
        <View style={styles.separator} />
        <WheelPicker
          ref={dayRef}
          data={visibleDays}
          selectedIndex={Math.min(selectedDay, maxDays - 1)}
          onSelect={(_, index) => setSelectedDay(index)}
          width={DAY_WIDTH}
        />
        <View style={styles.separator} />
        <WheelPicker
          ref={yearRef}
          data={years}
          selectedIndex={selectedYear}
          onSelect={(_, index) => setSelectedYear(index)}
          width={YEAR_WIDTH}
        />
      </View>

      {/* Time Picker */}
      {showTime && (
        <View style={styles.timePickerRow}>
          {/* Single unified selection highlight */}
          <View style={styles.selectionOverlay} pointerEvents="none">
            <View style={styles.selectionHighlight} />
          </View>
          <WheelPicker
            ref={hourRef}
            data={hours}
            selectedIndex={selectedHour}
            onSelect={(_, index) => setSelectedHour(index)}
            width={HOUR_WIDTH}
            syncOnChange={false}
          />
          <Text style={styles.timeSeparator}>:</Text>
          <WheelPicker
            ref={minuteRef}
            data={minutes}
            selectedIndex={selectedMinute}
            onSelect={(_, index) => setSelectedMinute(index)}
            width={MINUTE_WIDTH}
            syncOnChange={false}
          />
          <WheelPicker
            ref={ampmRef}
            data={AMPM}
            selectedIndex={selectedAmPm}
            onSelect={(_, index) => setSelectedAmPm(index)}
            width={AMPM_WIDTH}
            syncOnChange={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    // paddingVertical: 20,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: PICKER_WIDTH,
    height: PICKER_HEIGHT,
    // backgroundColor: "rgba(30, 30, 35, 0.95)",
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 0,
    borderColor: "rgba(255, 255, 255, 0)",
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 8 },
    // shadowOpacity: 0.25,
    // shadowRadius: 16,
    // elevation: 12,
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: TIME_PICKER_WIDTH,
    height: PICKER_HEIGHT,
    borderRadius: 15,
    overflow: "hidden",
    marginTop: 16,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: "bold",
    width: TIME_SEPARATOR_WIDTH,
    textAlign: "center",
  },
  separator: {
    // width: 1,
    // height: PICKER_HEIGHT * 0.4,
    // backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  wheelContainer: {
    height: PICKER_HEIGHT,
    overflow: "hidden",
    position: "relative",
  },
  monthPicker: {
    flex: 1.5,
  },
  dayPicker: {
    flex: 0.7,
  },
  yearPicker: {
    flex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    fontFamily: "bungee",
    fontSize: 20,
    // fontWeight: "600",
    // color: "#ffffff",
    textAlign: "center",
    fontVariant: ["proportional-nums"],
    letterSpacing: 0.5,
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  selectionHighlight: {
    height: ITEM_HEIGHT + 4,
    width: "100%",
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e5e560",
  },
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    // backgroundColor: "rgba(30, 30, 35, 0.85)",
    zIndex: 10,
  },
  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    // backgroundColor: "rgba(30, 30, 35, 0.85)",
    zIndex: 10,
  },
});
