import * as React from "react";
import { StyleSheet, View } from "react-native";
import { WidgetPreview } from "react-native-android-widget";

import { Counter } from "@/types/counter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MyWidget } from "../widget/CounterList";
const STORAGE_KEY = "@days_since_app_data_v2";

export default function HelloWidgetPreviewScreen() {
  const [counters, setCounters] = React.useState<Counter[]>([]);

  React.useEffect(() => {
    const loadCounters = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue != null) {
          setCounters(JSON.parse(jsonValue));
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadCounters();
  }, []);

  return (
    <View style={styles.container}>
      <WidgetPreview
        renderWidget={() => <MyWidget data={counters} />}
        width={320}
        height={200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
