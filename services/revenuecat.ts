import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  Offerings,
  PurchasesError,
  PurchasesErrorCode,
  PurchasesOffering,
} from "react-native-purchases";
import { Paywall } from "react-native-purchases-ui";

const API_KEY = "test_IXpZfwYKUUWadYeWceitMLXEqso";
export const ENTITLEMENT_ID = "timekeeper Pro";

export type RevenueCatPackage = PurchasesOffering["availablePackages"][number];

type ConfigureOptions = {
  userId?: string | null;
  observerMode?: boolean;
};

class RevenueCatService {
  private initialized = false;

  async configure(options: ConfigureOptions = {}) {
    if (this.initialized) {
      if (options.userId) {
        await Purchases.logIn(options.userId);
      }
      return;
    }

    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);

    await Purchases.configure({
      apiKey: API_KEY,
      appUserID: options.userId ?? undefined,
      observerMode: options.observerMode ?? false,
    });

    this.initialized = true;
  }

  async logOutIfNeeded() {
    if (!this.initialized) {
      return;
    }
    await Purchases.logOut();
  }

  async getOfferings(): Promise<Offerings> {
    try {
      return await Purchases.getOfferings();
    } catch (error) {
      this.handleError("getOfferings", error);
      throw error;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      this.handleError("getCustomerInfo", error);
      throw error;
    }
  }

  async isPro(customerInfo?: CustomerInfo): Promise<boolean> {
    const info = customerInfo ?? (await this.getCustomerInfo());
    return Boolean(info.entitlements.active[ENTITLEMENT_ID]);
  }

  async purchasePackage(pkg: RevenueCatPackage) {
    try {
      const result = await Purchases.purchasePackage(pkg);
      const active = await this.isPro(result.customerInfo);
      return { ...result, isPro: active };
    } catch (error) {
      if (this.isAbortError(error)) {
        return { cancelled: true as const };
      }
      this.handleError("purchasePackage", error);
      throw error;
    }
  }

  async restorePurchases() {
    try {
      const info = await Purchases.restorePurchases();
      const active = await this.isPro(info);
      return { info, isPro: active };
    } catch (error) {
      this.handleError("restorePurchases", error);
      throw error;
    }
  }

  presentPaywall(offeringIdentifier?: string) {
    return Paywall.presentPaywall({
      offeringIdentifier,
      displayCloseButton: true,
    });
  }

  presentCustomerCenter(customerInfo?: CustomerInfo) {
    return Paywall.presentCustomerCenter({
      customerInfo,
      displayCloseButton: true,
    });
  }

  private isAbortError(error: unknown): error is PurchasesError {
    if (!error || typeof error !== "object" || !("code" in error)) {
      return false;
    }
    const code = (error as PurchasesError).code;
    return (
      code === PurchasesErrorCode.PurchaseCancelledError ||
      code === PurchasesErrorCode.PurchaseNotAllowedError ||
      code === PurchasesErrorCode.PurchaseNotAllowedForAppError
    );
  }

  private handleError(scope: string, error: unknown) {
    console.error(`[RevenueCat] ${scope} failed`, error);
  }
}

export const revenueCat = new RevenueCatService();

export const PRODUCT_IDS = {
  monthly: "monthly",
  yearly: "yearly",
  lifetime: "lifetime",
} as const;
