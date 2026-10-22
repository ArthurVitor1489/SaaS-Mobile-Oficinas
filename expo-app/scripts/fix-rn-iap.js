const fs = require('fs');
const path = require('path');

const iapAndroidDir = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-iap',
  'android'
);

// 1. Update gradle.properties to use Google Play Billing Library 8.0.0
const gradlePropsPath = path.join(iapAndroidDir, 'gradle.properties');
if (fs.existsSync(gradlePropsPath)) {
  let props = fs.readFileSync(gradlePropsPath, 'utf8');
  if (props.includes('RNIap_playBillingSdkVersion=7.0.0')) {
    props = props.replace(
      'RNIap_playBillingSdkVersion=7.0.0',
      'RNIap_playBillingSdkVersion=8.0.0'
    );
    fs.writeFileSync(gradlePropsPath, props, 'utf8');
    console.log('[postinstall] Updated RNIap_playBillingSdkVersion to 8.0.0 in gradle.properties.');
  }
}

// 2. Patch RNIapModule.kt for React Native 0.81 and Play Billing Library 8.0.0 compatibility
const filePath = path.join(
  iapAndroidDir,
  'src',
  'play',
  'java',
  'com',
  'dooboolab',
  'rniap',
  'RNIapModule.kt'
);

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 2a. Fix currentActivity for React Native 0.81+
  if (content.includes('val activity = currentActivity')) {
    content = content.replace(
      'val activity = currentActivity',
      'val activity = reactApplicationContext.currentActivity'
    );
    modified = true;
  }

  // 2b. Add PendingPurchasesParams and QueryProductDetailsResult imports for Billing 8.0.0
  if (!content.includes('import com.android.billingclient.api.PendingPurchasesParams')) {
    content = content.replace(
      'import com.android.billingclient.api.ProductDetails',
      'import com.android.billingclient.api.PendingPurchasesParams\nimport com.android.billingclient.api.ProductDetails\nimport com.android.billingclient.api.QueryProductDetailsResult'
    );
    content = content.replace(
      'import com.android.billingclient.api.PurchaseHistoryRecord\n',
      ''
    );
    content = content.replace(
      'import com.android.billingclient.api.QueryPurchaseHistoryParams\n',
      ''
    );
    modified = true;
  }

  // 2c. Update enablePendingPurchases() to pass PendingPurchasesParams in Billing 8.0.0
  if (content.includes('BillingClient.newBuilder(reactContext).enablePendingPurchases()')) {
    content = content.replace(
      'BillingClient.newBuilder(reactContext).enablePendingPurchases()',
      'BillingClient.newBuilder(reactContext).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())'
    );
    modified = true;
  }

  // 2d. Update queryProductDetailsAsync callback signature for Billing 8.0.0 (QueryProductDetailsResult)
  if (content.includes('billingClient.queryProductDetailsAsync(params) { billingResult, skuDetailsList ->')) {
    content = content.replace(
      `            billingClient.queryProductDetailsAsync(params) { billingResult, skuDetailsList ->
                if (!isValidResult(billingResult, promise)) return@queryProductDetailsAsync`,
      `            billingClient.queryProductDetailsAsync(params) { billingResult: BillingResult, productDetailsResult: QueryProductDetailsResult ->
                if (!isValidResult(billingResult, promise)) return@queryProductDetailsAsync
                val skuDetailsList = productDetailsResult.productDetailsList`
    );
    modified = true;
  }

  // 2e. Replace removed queryPurchaseHistoryAsync in Billing 8.0.0 with queryPurchasesAsync
  if (content.includes('billingClient.queryPurchaseHistoryAsync(')) {
    const oldHistoryBlock = `    @ReactMethod
    fun getPurchaseHistoryByType(
        type: String,
        promise: Promise,
    ) {
        ensureConnection(
            promise,
        ) { billingClient ->
            billingClient.queryPurchaseHistoryAsync(
                QueryPurchaseHistoryParams
                    .newBuilder()
                    .setProductType(
                        if (type == "subs") BillingClient.ProductType.SUBS else BillingClient.ProductType.INAPP,
                    ).build(),
            ) { billingResult: BillingResult, purchaseHistoryRecordList: MutableList<PurchaseHistoryRecord>? ->

                if (!isValidResult(billingResult, promise)) return@queryPurchaseHistoryAsync

                Log.d(TAG, purchaseHistoryRecordList.toString())
                val items = Arguments.createArray()
                purchaseHistoryRecordList?.forEach { purchase ->
                    val item = Arguments.createMap()
                    item.putString("productId", purchase.products[0])
                    val products = Arguments.createArray()
                    purchase.products.forEach { products.pushString(it) }
                    item.putArray("productIds", products)
                    item.putDouble("transactionDate", purchase.purchaseTime.toDouble())
                    item.putString("transactionReceipt", purchase.originalJson)
                    item.putString("purchaseToken", purchase.purchaseToken)
                    item.putString("dataAndroid", purchase.originalJson)
                    item.putString("signatureAndroid", purchase.signature)
                    item.putString("developerPayload", purchase.developerPayload.orEmpty())
                    items.pushMap(item)
                }
                promise.safeResolve(items)
            }
        }
    }`;

    const newHistoryBlock = `    @ReactMethod
    fun getPurchaseHistoryByType(
        type: String,
        promise: Promise,
    ) {
        getAvailableItemsByType(type, promise)
    }`;

    if (content.includes(oldHistoryBlock)) {
      content = content.replace(oldHistoryBlock, newHistoryBlock);
      modified = true;
    } else {
      // Fallback normalized CRLF/LF replacement
      const normalizedContent = content.replace(/\r\n/g, '\n');
      if (normalizedContent.includes(oldHistoryBlock)) {
        content = normalizedContent.replace(oldHistoryBlock, newHistoryBlock);
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('[postinstall] Patched react-native-iap RNIapModule.kt for React Native 0.81 & Billing 8.0.0.');
  } else {
    console.log('[postinstall] react-native-iap RNIapModule.kt already patched.');
  }
}
