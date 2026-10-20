import { Platform } from 'react-native';
import {
  initConnection,
  getSubscriptions,
  requestSubscription,
  getAvailablePurchases,
  finishTransaction,
  SubscriptionAndroid,
} from 'react-native-iap';
import api from './api';

export const SUBSCRIPTION_ENTITLEMENT_ID = 'pro';
export const SUBSCRIPTION_PRODUCT_ID = 'mecanicapro_mensal_4990';
export const PLAN_PRICE_DISPLAY = 'R$ 49,90 / mês';

let isConnected = false;

/**
 * Inicializa a conexão direta com o Google Play Billing no Android
 */
export const initPurchases = async (_userId?: string): Promise<void> => {
  if (Platform.OS !== 'android') return;
  if (isConnected) return;

  try {
    const result = await initConnection();
    isConnected = !!result;
  } catch (error) {
    console.warn('[GooglePlayBilling] Erro ao conectar ao Google Play:', error);
  }
};

/**
 * Busca os detalhes da assinatura diretamente no Google Play Console
 */
export const fetchMonthlyPackage = async (): Promise<any | null> => {
  if (Platform.OS !== 'android') return null;

  try {
    if (!isConnected) {
      await initPurchases();
    }
    const subs = await getSubscriptions({ skus: [SUBSCRIPTION_PRODUCT_ID] });
    if (subs && subs.length > 0) {
      return subs[0];
    }
  } catch (error) {
    console.warn('[GooglePlayBilling] Erro ao buscar assinatura na Play Store:', error);
  }
  return null;
};

/**
 * Abre a janela oficial de assinatura do Google Play (7 dias grátis -> R$ 49,90/mês)
 */
export const buyMonthlySubscription = async (): Promise<{
  success: boolean;
  cancelled?: boolean;
  error?: string;
}> => {
  if (Platform.OS !== 'android') {
    return {
      success: false,
      error: 'Assinaturas Google Play estão disponíveis apenas em dispositivos Android.',
    };
  }

  try {
    if (!isConnected) {
      await initPurchases();
    }

    const subs = await getSubscriptions({ skus: [SUBSCRIPTION_PRODUCT_ID] });
    if (!subs || subs.length === 0) {
      return {
        success: false,
        error:
          'Assinatura ainda em sincronização com a Google Play Store. Certifique-se de que o aplicativo foi instalado pela Play Store e que o plano está Ativo no Play Console.',
      };
    }

    const sub = subs[0] as SubscriptionAndroid;
    const offers = sub.subscriptionOfferDetails || [];

    // Prioriza a oferta que possui período de teste grátis (7 dias grátis) ou usa a primeira oferta ativa do plano básico
    const selectedOffer =
      offers.find((o) =>
        o.pricingPhases?.pricingPhaseList?.some((p) => p.priceAmountMicros === '0'),
      ) || offers[0];

    const offerToken = selectedOffer?.offerToken;

    const purchaseResult = await requestSubscription({
      sku: SUBSCRIPTION_PRODUCT_ID,
      ...(offerToken
        ? {
            subscriptionOffers: [
              {
                sku: SUBSCRIPTION_PRODUCT_ID,
                offerToken,
              },
            ],
          }
        : {}),
    });

    const purchase = Array.isArray(purchaseResult) ? purchaseResult[0] : purchaseResult;

    if (purchase) {
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch (ackErr) {
        console.warn('[GooglePlayBilling] Aviso ao confirmar transação:', ackErr);
      }

      // Registra a assinatura ativa no servidor em nuvem
      try {
        await api.post('/subscription/google-play/confirm', {
          productId: purchase.productId || SUBSCRIPTION_PRODUCT_ID,
          purchaseToken: purchase.purchaseToken,
          transactionId: purchase.transactionId,
        });
      } catch (serverErr) {
        console.warn('[GooglePlayBilling] Sincronização em nuvem pendente:', serverErr);
      }

      return { success: true };
    }

    return {
      success: false,
      error: 'A compra não pôde ser concluída no Google Play.',
    };
  } catch (error: any) {
    const code = error?.code || '';
    const msg = error?.message || '';
    if (
      code === 'E_USER_CANCELLED' ||
      msg.toLowerCase().includes('cancel') ||
      msg.includes('User cancelled')
    ) {
      return { success: false, cancelled: true };
    }
    return {
      success: false,
      error:
        error?.message ||
        'Não foi possível abrir o pagamento do Google Play. Verifique se o app foi baixado pela Play Store.',
    };
  }
};

/**
 * Restaura compras ativas diretamente da conta Google Play do aparelho
 */
export const restoreGooglePurchases = async (): Promise<{
  success: boolean;
  isSubscribed: boolean;
  error?: string;
}> => {
  if (Platform.OS !== 'android') {
    return { success: false, isSubscribed: false, error: 'Disponível apenas no Android.' };
  }

  try {
    if (!isConnected) {
      await initPurchases();
    }

    const purchases = await getAvailablePurchases();
    const activeSub = purchases?.find((p) => p.productId === SUBSCRIPTION_PRODUCT_ID);

    if (activeSub) {
      try {
        await api.post('/subscription/google-play/confirm', {
          productId: activeSub.productId,
          purchaseToken: activeSub.purchaseToken,
          transactionId: activeSub.transactionId,
        });
      } catch {}
      return { success: true, isSubscribed: true };
    }

    return { success: true, isSubscribed: false };
  } catch (error: any) {
    return {
      success: false,
      isSubscribed: false,
      error: error?.message || 'Não foi possível consultar compras no Google Play.',
    };
  }
};

/**
 * Verifica se há assinatura ativa vinculada à conta Google Play do usuário
 */
export const checkGoogleSubscriptionStatus = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  try {
    if (!isConnected) {
      await initPurchases();
    }
    const purchases = await getAvailablePurchases();
    const activeSub = purchases?.find((p) => p.productId === SUBSCRIPTION_PRODUCT_ID);
    if (activeSub) {
      try {
        await api.post('/subscription/google-play/confirm', {
          productId: activeSub.productId,
          purchaseToken: activeSub.purchaseToken,
          transactionId: activeSub.transactionId,
        });
      } catch {}
      return true;
    }
    return false;
  } catch {
    return false;
  }
};
