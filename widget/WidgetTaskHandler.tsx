import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Appearance } from "react-native";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { MyWidget } from "./CounterList";
// --- AsyncStorage Key ---
const STORAGE_KEY = "@days_since_app_data_v2";

const nameToWidget = {
  // Hello will be the **name** with which we will reference our widget.
  TimeKeeper: MyWidget,
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const Widget =
    nameToWidget[widgetInfo.widgetName as keyof typeof nameToWidget];

  const loadCounters = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        return JSON.parse(jsonValue);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  const renderWidget = async () => {
    const counters = await loadCounters();
    const theme = Appearance.getColorScheme() ?? "light";
    props.renderWidget(<Widget data={counters} theme={theme} />);
  };

  switch (props.widgetAction) {
    case "WIDGET_ADDED":
      await renderWidget();
      break;

    case "WIDGET_UPDATE":
      await renderWidget();
      break;

    case "WIDGET_RESIZED":
      await renderWidget();
      break;

    case "WIDGET_DELETED":
      // Not needed for now
      break;

    case "WIDGET_CLICK":
      if (props.clickAction === "REFRESH_WIDGET") {
        await renderWidget();
      }
      break;

    default:
      break;
  }
}
