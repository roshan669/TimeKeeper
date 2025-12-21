import { Counter } from "@/types/counter";
import {
  FlexWidget,
  ImageWidget,
  ListWidget,
  TextWidget,
} from "react-native-android-widget";

interface counterprops {
  data: Counter[];
  theme?: "light" | "dark" | null;
}

// Helper to format date
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Helper to calculate display values
const calculateTime = (item: Counter) => {
  const now = Date.now();
  let diff = 0;
  let label = "";

  if (item.type === "countdown") {
    diff = Math.max(0, item.createdAt - now);
  } else {
    diff = Math.max(0, now - item.createdAt);
  }

  const totalSeconds = Math.floor(diff / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  let value = "";

  if (totalDays > 0) {
    value = totalDays.toString();
    label =
      item.type === "countdown"
        ? totalDays === 1
          ? "DAY TO"
          : "DAYS TO"
        : totalDays === 1
        ? "DAY SINCE"
        : "DAYS SINCE";
  } else if (totalHours >= 1) {
    value = totalHours.toString();
    label = item.type === "countdown" ? "HOURS TO" : "HOURS SINCE";
  } else if (totalMinutes >= 1) {
    value = totalMinutes.toString();
    label = item.type === "countdown" ? "MINUTES TO" : "MINUTES SINCE";
  } else {
    value = totalSeconds.toString();
    label = item.type === "countdown" ? "SECONDS TO" : "SECONDS SINCE";
  }

  return { value, label };
};

export function MyWidget({ data, theme }: counterprops) {
  const isDark = theme === "dark";
  const backgroundColor = isDark ? "#1b1b1bff" : "#FFFFFF";
  const textColor = isDark ? "#FFFFFF" : "#000000";

  return (
    <FlexWidget
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: backgroundColor,
        flexDirection: "column",
      }}
    >
      {/* Top Bar */}
      <FlexWidget
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: 8,
          width: "match_parent",
        }}
      >
        <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
          <ImageWidget
            image={require("../assets/images/icon.png")}
            imageWidth={24}
            imageHeight={24}
            style={{ width: 24, height: 24, marginRight: 8 }}
          />
          <TextWidget
            text="TimeKeeper"
            style={{
              fontSize: 16,
              fontFamily: "bungee",
              color: textColor,
            }}
          />
        </FlexWidget>

        <FlexWidget
          clickAction="REFRESH_WIDGET"
          style={{
            padding: 4,
          }}
        >
          <TextWidget
            text="↻"
            style={{
              fontSize: 24,
              fontFamily: "bungee",
              color: textColor,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      <ListWidget
        style={{
          height: "match_parent",
          width: "match_parent",
          paddingVertical: 8,
        }}
      >
        {data?.map((counter: Counter, i) => {
          const { value, label } = calculateTime(counter);
          const dateText = formatDate(counter.createdAt);

          // Gradient colors based on type
          const gradientColors =
            counter.type === "countdown"
              ? { from: "#E0E0E0", to: "#4285F4" }
              : { from: "#FEC9CE", to: "#FF96A1" };

          return (
            <FlexWidget
              key={i}
              style={{
                width: "match_parent",
                paddingBottom: 16, // Add spacing wrapper
                paddingHorizontal: 16,
              }}
            >
              <FlexWidget
                style={{
                  width: "match_parent",
                  height: 100,
                  borderRadius: 16,
                  padding: 12,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundGradient: {
                    from: gradientColors.from,
                    to: gradientColors.to,
                    orientation: "TL_BR",
                  },
                }}
                clickAction="OPEN_URI"
                clickActionData={{
                  uri: `timekeeper://details?id=${
                    counter.id
                  }&name=${encodeURIComponent(counter.name)}&creation=${
                    counter.createdAt
                  }&type=${counter.type}&completed=${counter.completed}`,
                }}
              >
                {/* Left Column: Time Value and Label */}
                <FlexWidget
                  style={{
                    flexDirection: "column",
                    justifyContent: "center",
                    // alignItems: "flex-start",
                    width: "wrap_content",
                  }}
                >
                  <TextWidget
                    text={value}
                    style={{
                      fontSize: 25,
                      fontFamily: "bungee",
                      color: "#000000",
                      height: 45,
                      textAlign: "right",
                    }}
                  />
                  <TextWidget
                    text={label}
                    style={{
                      fontSize: 12,
                      fontFamily: "bungee",
                      color: "#000000",
                      // opacity: 0.7,
                    }}
                  />
                </FlexWidget>

                {/* Right Column: Date and Name */}
                <FlexWidget
                  style={{
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-end",
                    flex: 1,
                    marginLeft: 16,
                  }}
                >
                  <TextWidget
                    text={dateText}
                    style={{
                      fontSize: 12,
                      fontFamily: "bungee",
                      color: "#000000",
                      marginBottom: 4,
                    }}
                  />
                  <TextWidget
                    text={counter.name}
                    style={{
                      fontSize: 18,
                      fontFamily: "bungee",
                      color: "#000000",
                      textAlign: "right",
                    }}
                    maxLines={2}
                  />
                </FlexWidget>
              </FlexWidget>
            </FlexWidget>
          );
        })}
      </ListWidget>
    </FlexWidget>
  );
}
