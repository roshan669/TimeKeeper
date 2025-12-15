import React, { useMemo } from "react";
import { withLayoutContext } from "expo-router";
import { StatusBar } from "react-native";
import { MD3LightTheme, MD3DarkTheme, PaperProvider } from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ThemeProvider, useThemeContext } from "@/context/ThemeContext";
import {
  createStackNavigator,
  StackNavigationOptions,
  StackNavigationEventMap,
  StackCardInterpolationProps,
} from "@react-navigation/stack";
import { ParamListBase, NavigationState } from "@react-navigation/native";
import { CounterProvider } from "@/context/counterContext";

const { Navigator } = createStackNavigator();

export const Stack = withLayoutContext<
  StackNavigationOptions,
  typeof Navigator,
  NavigationState<ParamListBase>,
  StackNavigationEventMap
>(Navigator);

// Your custom interpolator for a popping effect
const forScale = ({ current }: StackCardInterpolationProps) => ({
  cardStyle: {
    opacity: current.progress, // Fade in the card
    transform: [
      {
        scale: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1], // Start slightly smaller (0.9) and scale to full size (1)
          extrapolate: "clamp",
        }),
      },
    ],
  },
  overlayStyle: {
    // This creates a dimming effect behind the modal
    opacity: current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.4], // Adjust dimming strength (0.4 for moderate dimming)
      extrapolate: "clamp",
    }),
  },
});

// This component directly contains the Stack Navigator
function RootContent() {
  const { themeMode } = useThemeContext();

  const theme = useMemo(() => {
    const baseTheme = themeMode === "dark" ? MD3DarkTheme : MD3LightTheme;
    const customColors =
      themeMode === "dark"
        ? { primary: "#85C1E9", secondary: "#424242" }
        : { primary: "#5DADE2", secondary: "lightgrey" };

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        ...customColors,
      },
    };
  }, [themeMode]);

  return (
    <PaperProvider theme={theme}>
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle={themeMode === "dark" ? "light-content" : "dark-content"}
      />
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="details"
          options={{
            headerShown: false,
            // Use "transparentModal" to allow the overlayStyle to work
            presentation: "transparentModal",
            cardStyleInterpolator: forScale,
          }}
        />
        <Stack.Screen
          name="add.modal"
          options={{
            headerShown: false,
            cardStyleInterpolator: forScale,

            presentation: "transparentModal",
          }}
        />
      </Stack>
    </PaperProvider>
  );
}

// Default export is what Expo Router renders for this layout
export default function Layout() {
  return (
    <ThemeProvider>
      <CounterProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootContent />
        </GestureHandlerRootView>
      </CounterProvider>
    </ThemeProvider>
  );
}
