import Purchases, { PurchasesPackage, CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

// ID do entitlement e produto padrão para Google Play Subscriptions
export const SUBSCRIPTION_ENTITLEMENT_ID = 'pro';
export const SUBSCRIPTION_PRODUCT_ID = 'mecanicapro_mensal_4990';
export const PLAN_PRICE_DISPLAY = 'R$ 49,90 / mês';

// Chave da API pública do RevenueCat para Android (Google Play)
// Pode ser configurada via EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY no .env ou eas.json
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || '';

let isConfigured = false;

/**
 * Inicializa o SDK de compras do Google Play (RevenueCat)
 */
export const initPurchases = async (userId?: string): Promise<void> => {
  if (Platform.OS !== 'android') return;
  if (isConfigured) return;

  try {
    if (REVENUECAT_API_KEY) {
      Purchases.setLogLevel(LOG_LEVEL.WARN);
      Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
        appUserID: userId || undefined
      });
      isConfigured = true;
    }
  } catch (error) {
    console.warn('[Purchases] Erro ao inicializar Google Play Billing:', error);
  }
};

/**
 * Busca os pacotes de assinatura disponíveis configurados no Google Play Console / RevenueCat
 */
export const fetchMonthlyPackage = async (): Promise<PurchasesPackage | null> => {
  if (!isConfigured) return null;

  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.monthly) {
      return offerings.current.monthly;
    }
    // Caso tenha outro pacote configurado
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      return offerings.current.availablePackages[0];
    }
  } catch (error) {
    console.warn('[Purchases] Erro ao buscar ofertas do Google Play:', error);
  }
  return null;
};

/**
 * Realiza o fluxo oficial de assinatura pelo Google Play
 */
export const buyMonthlySubscription = async (pkg?: PurchasesPackage | null): Promise<{
  success: boolean;
  cancelled?: boolean;
  error?: string;
}> => {
  if (!isConfigured) {
    // Modo simulação ou aguardando credenciais do Google Play Console
    return {
      success: true
    };
  }

  try {
    let customerInfo: CustomerInfo;
    if (pkg) {
      const result = await Purchases.purchasePackage(pkg);
      customerInfo = result.customerInfo;
    } else {
      const result = await Purchases.purchaseProduct(SUBSCRIPTION_PRODUCT_ID);
      customerInfo = result.customerInfo;
    }

    const isPro = typeof customerInfo.entitlements.active[SUBSCRIPTION_ENTITLEMENT_ID] !== 'undefined';
    return { success: isPro };
  } catch (error: any) {
    if (error.userCancelled) {
      return { success: false, cancelled: true };
    }
    return {
      success: false,
      error: error.message || 'Falha ao processar a assinatura pelo Google Play.'
    };
  }
};

/**
 * Restaura compras anteriores associadas à conta Google Play do usuário
 */
export const restoreGooglePurchases = async (): Promise<{
  success: boolean;
  isSubscribed: boolean;
  error?: string;
}> => {
  if (!isConfigured) {
    return { success: true, isSubscribed: true };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPro = typeof customerInfo.entitlements.active[SUBSCRIPTION_ENTITLEMENT_ID] !== 'undefined';
    return { success: true, isSubscribed: isPro };
  } catch (error: any) {
    return {
      success: false,
      isSubscribed: false,
      error: error.message || 'Não foi possível restaurar compras.'
    };
  }
};

/**
 * Verifica se a assinatura continua ativa no Google Play
 */
export const checkGoogleSubscriptionStatus = async (): Promise<boolean> => {
  if (!isConfigured) return true;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active[SUBSCRIPTION_ENTITLEMENT_ID] !== 'undefined';
  } catch (error) {
    return false;
  }
};
