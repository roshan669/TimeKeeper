import { useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";

import { useRevenueCat } from "@/context/RevenueCatContext";
import {
  PRODUCT_IDS,
  revenueCat,
  type RevenueCatPackage,
} from "@/services/revenuecat";

const PRODUCT_ORDER = [
  PRODUCT_IDS.monthly,
  PRODUCT_IDS.yearly,
  PRODUCT_IDS.lifetime,
] as const;

type OrderedPackage = RevenueCatPackage & { sort: number };

export default function Subscriptions() {
  const { isPro, customerInfo, loading, refresh } = useRevenueCat();
  const [packages, setPackages] = useState<RevenueCatPackage[]>([]);
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    revenueCat
      .getOfferings()
      .then((offerings) => {
        const current = offerings.current;
        if (!current) {
          Alert.alert(
            "Subscriptions unavailable",
            "No active offering is configured."
          );
          return;
        }
        const ordered = [...current.availablePackages]
          .map((pkg) => {
            const identifier = pkg.storeProduct.identifier;
            const sort = PRODUCT_ORDER.indexOf(
              identifier as (typeof PRODUCT_ORDER)[number]
            );
            return { pkg, sort: sort === -1 ? Number.MAX_SAFE_INTEGER : sort };
          })
          .sort((a, b) => a.sort - b.sort)
          .map((entry) => entry.pkg);
        setPackages(ordered);
      })
      .catch((error: Error) => {
        Alert.alert("Error", error.message || "Unable to fetch offerings");
      })
      .finally(() => setInitializing(false));
  }, []);

  const handlePurchase = async (selected: RevenueCatPackage) => {
    setBusy(true);
    try {
      const result = await revenueCat.purchasePackage(selected);
      if ((result as { cancelled?: boolean }).cancelled) {
        return;
      }
      await refresh();
      if ((result as { isPro?: boolean }).isPro) {
        Alert.alert("Success", "You now have Timekeeper Pro!");
      }
    } catch (error: any) {
      Alert.alert(
        "Purchase failed",
        error?.message ?? "Please try again later."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      const { isPro: pro } = await revenueCat.restorePurchases();
      await refresh();
      if (pro) {
        Alert.alert(
          "Restored",
          "Your Timekeeper Pro access has been restored."
        );
      } else {
        Alert.alert(
          "No purchases",
          "We could not find any active subscriptions."
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Restore failed",
        error?.message ?? "Please try again later."
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePaywall = () => {
    revenueCat.presentPaywall().catch((error: Error) => {
      Alert.alert(
        "Paywall error",
        error.message || "Unable to display paywall."
      );
    });
  };

  const handleCustomerCenter = () => {
    if (!customerInfo) {
      Alert.alert("Please wait", "Customer data is still loading.");
      return;
    }
    revenueCat.presentCustomerCenter(customerInfo).catch((error: Error) => {
      Alert.alert(
        "Customer Center",
        error.message || "Unable to open customer center."
      );
    });
  };

  if (loading || initializing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <Card.Title title="Membership" />
        <Card.Content>
          <Text>
            {isPro
              ? "You currently have Timekeeper Pro."
              : "You are using the free tier."}
          </Text>
        </Card.Content>
      </Card>

      {packages.map((pkg) => (
        <Card key={pkg.identifier} style={{ marginBottom: 16 }}>
          <Card.Title
            title={pkg.storeProduct.title}
            subtitle={pkg.storeProduct.description}
          />
          <Card.Content>
            <Text>{pkg.storeProduct.priceString}</Text>
          </Card.Content>
          <Card.Actions>
            <Button
              mode="contained"
              disabled={busy}
              onPress={() => handlePurchase(pkg)}
            >
              Select
            </Button>
          </Card.Actions>
        </Card>
      ))}

      <Button mode="text" style={{ marginBottom: 8 }} onPress={handlePaywall}>
        View RevenueCat Paywall
      </Button>
      <Button
        mode="text"
        style={{ marginBottom: 8 }}
        onPress={handleCustomerCenter}
      >
        Manage Subscription (Customer Center)
      </Button>
      <Button mode="outlined" disabled={busy} onPress={handleRestore}>
        Restore Purchases
      </Button>
    </ScrollView>
  );
}
