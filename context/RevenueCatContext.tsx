import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Purchases, {
  CustomerInfo,
  PurchasesCustomerInfoUpdateListener,
} from "react-native-purchases";

import { ENTITLEMENT_ID, revenueCat } from "@/services/revenuecat";

type RevenueCatState = {
  loading: boolean;
  customerInfo: CustomerInfo | null;
  isPro: boolean;
  refresh: () => Promise<void>;
};

const RevenueCatContext = createContext<RevenueCatState | undefined>(undefined);

export function RevenueCatProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const isPro = useMemo(() => {
    if (!customerInfo) {
      return false;
    }
    return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
  }, [customerInfo]);

  const refresh = async () => {
    setLoading(true);
    try {
      const info = await revenueCat.getCustomerInfo();
      setCustomerInfo(info);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    revenueCat
      .configure()
      .then(refresh)
      .catch((error) => {
        console.error("[RevenueCat] configure error", error);
        setLoading(false);
      });

    const listener: PurchasesCustomerInfoUpdateListener = (info) => {
      setCustomerInfo(info);
    };

    const subscription = Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <RevenueCatContext.Provider
      value={{ loading, customerInfo, isPro, refresh }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const value = useContext(RevenueCatContext);
  if (!value) {
    throw new Error("useRevenueCat must be used within RevenueCatProvider");
  }
  return value;
}
