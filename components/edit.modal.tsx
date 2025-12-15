import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Counter } from "@/app"; // Assuming this path is correct for your project
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Button, Icon, TextInput } from "react-native-paper";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import DatePicker from "react-native-date-picker";

const STORAGE_KEY = "@days_since_app_data_v2";

interface modalProps {
  isVisible: boolean;
  onClose: () => void;
  id: string;
  cName: string;
  cDate: string;
  type: string;
}

export default function EditModal({
  isVisible,
  onClose,
  id,
  cName,
  cDate,
  type,
}: modalProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [name, setName] = useState<string>();

  const router = useRouter();

  async function editCounter(id: string) {
    const data = await AsyncStorage.getItem(STORAGE_KEY);

    if (data) {
      const counterArray: Counter[] | null = JSON.parse(data);

      const newCounterArray = counterArray?.map((c) => {
        if (c.id === id) {
          if (name !== undefined && name !== null) {
            c.name = name;
          }
          if (date !== undefined && date !== null) {
            c.createdAt = date.getTime(); // Corrected: use getTime()
          }
        }
        return c;
      });

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newCounterArray));
      router.replace("/");
    }
  }

  return (
    <Modal
      visible={isVisible}
      onRequestClose={onClose}
      // transparent
      animationType="fade"
      statusBarTranslucent
    >
      {/* Outer View to act as a full-screen overlay */}
      <LinearGradient
        colors={["#FEC9CE", "#FF96A3"]}
        start={{ x: 1, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.modalContentWrapper}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"} // 'height' is often more reliable than 'position' for Android
          style={styles.keyboardAvoidingContainer}
        >
          <View style={styles.container}>
            <View style={{ width: "80%" }}>
              <Text style={[styles.modalTitle, { color: "#000" }]}>
                {cName}
              </Text>
              <TextInput
                // label={cName}
                placeholder="new name here..."
                selectionColor="red"
                onChangeText={setName}
                underlineColor="#000"
                activeUnderlineColor="#000"
                placeholderTextColor="#000"
                style={[{ backgroundColor: "" }]}
                textColor="#000"
              />
            </View>

            <DatePicker
              title={"Date"}
              mode={"date"}
              date={date}
              onDateChange={setDate}
            />

            <View style={{ flexDirection: "row", gap: 50, marginTop: 25 }}>
              <Button
                mode="elevated"
                elevation={2}
                style={styles.modalButton}
                labelStyle={styles.buttonLabel}
                onPress={() => onClose()}
              >
                {/* <Icon source="cancel" size={35} color="black" /> */}
                cancel
              </Button>
              <Button
                mode="elevated"
                elevation={2}
                style={styles.modalButton}
                labelStyle={styles.buttonLabel}
                onPress={() => editCounter(id)}
              >
                {/* <Icon source="check" size={35} color="black" /> */}
                Ok
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContentWrapper: {
    flex: 1, // Make it fill the entire modal
    // backgroundColor: "rgba(0,0,0,0.5)", // Optional: Add a dim background
    justifyContent: "center", // Center the content vertically
    alignItems: "center", // Center the content horizontall
  },
  keyboardAvoidingContainer: {
    flex: 1, // Make it fill its parent (modalContentWrapper)
    width: "100%", // Also ensure it takes full width
    justifyContent: "center", // Center the LinearGradient
    alignItems: "center", // Center the LinearGradient
  },
  container: {
    width: "90%", // Keep your desired width for the modal content
    // height: "50%", // Keep your desired height for the modal content (e.g., 50% of parent)
    padding: 20,
    gap: 10, // Reduced gap to give more space for content
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    // elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  btn: {
    height: 50,
    width: "80%",
    justifyContent: "center",
    alignItems: "center",
    borderBottomColor: "#000",
    borderBottomWidth: 0.4,
  },
  modalTitle: {
    marginBottom: 25,
    textAlign: "center",
    fontFamily: "Roboto-Bold",
    fontSize: 15,
  },
  modalButton: {
    minWidth: 110,
    borderRadius: 8,
    backgroundColor: "#ff96a9",
  },
  buttonLabel: {
    color: "#000",
    fontSize: 15,
    // fontFamily: "Roboto-Bold",
  },
});
