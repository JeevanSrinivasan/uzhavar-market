/**
 * Pricing utility for Uzhavar Market
 * Computes verified Tamil Nadu retail market highest benchmarks (MRP),
 * auto-detection on approval, manual admin rate overrides,
 * strikethrough calculations, and customer discount badges.
 */

// Comprehensive Tamil Nadu retail market highest rates benchmark database
export const TN_MARKET_BENCHMARKS = {
  // Palm & Sugarcane Jaggery
  'karupatti': 580,
  'palm jaggery': 580,
  'பனை கருப்பட்டி': 580,
  'கருப்பட்டி': 580,
  'naatu sakkarai': 130,
  'country sugar': 130,
  'நாட்டு சர்க்கரை': 130,
  'palm sugar': 420,
  'palm candy': 420,
  'பனங்கற்கண்டு': 420,
  'kalkandu': 420,
  'jaggery': 120,
  'vellam': 120,
  'வெல்லம்': 120,

  // Cold Pressed Oils
  'gingelly': 450,
  'sesame': 450,
  'nallennai': 450,
  'நல்லெண்ணெய்': 450,
  'groundnut': 350,
  'peanut': 350,
  'kadalai': 350,
  'கடலை எண்ணெய்': 350,
  'coconut oil': 300,
  'thengai': 300,
  'தேங்காய் எண்ணெய்': 300,
  'castor': 380,
  'vilakkenai': 380,
  'விளக்கெண்ணெய்': 380,
  'neem oil': 400,
  'veppa ennai': 400,
  'வேப்ப எண்ணெய்': 400,

  // Pure Honey
  'wild honey': 850,
  'kombu thean': 850,
  'கொம்பு தேன்': 850,
  'காட்டுத் தேன்': 850,
  'mountain honey': 750,
  'malai thean': 750,
  'மலைத்தேன்': 750,
  'honey': 500,
  'thean': 500,
  'தேன்': 500,

  // Organic & Bio Fertilizers
  'humic liquid': 280,
  'humic': 280,
  'ஹியூமிக்': 280,
  'seaweed liquid': 290,
  'seaweed': 290,
  'கடல்பாசி': 290,
  'fish amino acid': 270,
  'fish amino': 270,
  'மீன் அமிலம்': 270,
  'panchagavya': 250,
  'பஞ்சகாவ்யா': 250,
  'jeevamrutham': 180,
  'ஜீவாமிர்தம்': 180,
  'organic complex': 1550,
  'இயற்கை கலவை உரம்': 1550,
  'vermicompost': 30,
  'மண்புழு உரம்': 30,
  'neem cake': 55,
  'வேப்பம் புண்ணாக்கு': 55,

  // Traditional & Native Rice
  'karuppu kavuni': 200,
  'kavuni': 200,
  'கருப்பு கவுனி': 200,
  'mappillai samba': 150,
  'மாப்பிள்ளை சம்பா': 150,
  'poongar': 140,
  'பூங்கார்': 140,
  'seeraga samba': 180,
  'சீரக சம்பா': 180,
  'kattuyanam': 160,
  'காட்டுயானம்': 160,
  'thooyamalli': 130,
  'தூயமல்லி': 130,
  'bamboo rice': 550,
  'மூங்கில் அரிசி': 550,

  // Millets
  'thinai': 140,
  'foxtail millet': 140,
  'தினை': 140,
  'kuthiraivali': 150,
  'barnyard millet': 150,
  'குதிரைவாலி': 150,
  'varagu': 140,
  'kodo millet': 140,
  'வரகு': 140,
  'samai': 160,
  'little millet': 160,
  'சாமை': 160,
  'ragi': 75,
  'finger millet': 75,
  'கேழ்வரகு': 75,
  'kambu': 75,
  'pearl millet': 75,
  'கம்பு': 75,
  'cholam': 80,
  'sorghum': 80,
  'சோளம்': 80,

  // Spices & Condiments
  'turmeric': 320,
  'manjal': 320,
  'மஞ்சள்': 320,
  'pepper': 950,
  'milagu': 950,
  'மிளகு': 950,
  'cardamom': 3200,
  'elakkai': 3200,
  'ஏலக்காய்': 3200,
  'country garlic': 320,
  'garlic': 300,
  'பூண்டு': 320,

  // Ghee
  'desi cow ghee': 1600,
  'cow ghee': 1500,
  'ghee': 1400,
  'பசு நெய்': 1600,
  'நெய்': 1400,
};

/**
 * Attempts to automatically detect the highest Tamil Nadu retail market rate for a product.
 * @param {string} productName Name of the product
 * @param {string} unit Unit of measurement
 * @param {number} customerPrice Total selling price to customer (farmer price + commission)
 * @returns {number|null} Returns detected market rate if found and > customerPrice, otherwise null
 */
export function detectTNMarketRate(productName, unit, customerPrice) {
  if (!productName) return null;
  const nameLower = String(productName).toLowerCase().trim();

  // Sort benchmark keys by length descending to match longest specific phrases first
  const sortedKeys = Object.keys(TN_MARKET_BENCHMARKS).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (nameLower.includes(key)) {
      const benchmarkRate = TN_MARKET_BENCHMARKS[key];
      // Only consider it valid if it is higher than the customer selling price
      if (benchmarkRate > customerPrice) {
        return benchmarkRate;
      }
    }
  }

  // Rare case: Rate cannot be determined automatically or is lower than customer price
  return null;
}

const REGISTRY_STORAGE_KEY = 'uzhavar_approved_market_prices';

/**
 * Persists an admin-approved market rate locally (serves as immediate fallback if DB column is pending)
 */
export function saveApprovedMarketPrice(productId, rate) {
  if (!productId || !rate || typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    const registry = raw ? JSON.parse(raw) : {};
    registry[productId] = Number(rate);
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(registry));
  } catch (err) {
    console.warn('Failed to save market price to local registry:', err);
  }
}

/**
 * Retrieves an approved market rate from the local registry
 */
export function getApprovedMarketPrice(productId) {
  if (!productId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    const registry = raw ? JSON.parse(raw) : {};
    return registry[productId] ? Number(registry[productId]) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Calculates selling price, market retail price (MRP), discount percentage, and total savings.
 * @param {object} product Product object from database
 * @returns {{ sellingPrice: number, marketPrice: number, discountPercent: number, savingsAmount: number, isAutoDetected: boolean }}
 */
export function getProductPricing(product) {
  const sellingPrice = Number(product?.price || 0) + Number(product?.commission_amount || 0);

  if (!sellingPrice || sellingPrice <= 0) {
    return {
      sellingPrice: 0,
      marketPrice: 0,
      discountPercent: 0,
      savingsAmount: 0,
      isAutoDetected: false,
    };
  }

  // 1. Direct explicit market_price / mrp from DB column
  let marketPrice = Number(product?.market_price || product?.mrp || 0);

  // 2. Check local admin-approved registry if DB column was empty
  if (!marketPrice || marketPrice <= sellingPrice) {
    const registered = getApprovedMarketPrice(product?.id);
    if (registered && registered > sellingPrice) {
      marketPrice = registered;
    }
  }

  // 3. Match against verified Tamil Nadu retail market benchmarks
  if (!marketPrice || marketPrice <= sellingPrice) {
    const detected = detectTNMarketRate(product?.name, product?.unit, sellingPrice);
    if (detected && detected > sellingPrice) {
      marketPrice = detected;
    }
  }

  // 4. Fallback for any legacy or other active items:
  // Apply a realistic 28% Tamil Nadu retail markup rounded up to nearest 10
  if (!marketPrice || marketPrice <= sellingPrice) {
    const rawMarket = sellingPrice * 1.28;
    marketPrice = Math.ceil(rawMarket / 10) * 10;
  }

  const savingsAmount = Math.max(0, marketPrice - sellingPrice);
  const discountPercent = marketPrice > 0 ? Math.round((savingsAmount / marketPrice) * 100) : 0;

  return {
    sellingPrice,
    marketPrice,
    discountPercent,
    savingsAmount,
    isAutoDetected: !product?.market_price && !product?.mrp,
  };
}

// =======================================================
// DELIVERY PRICING & MINIMUM QUANTITY CONFIGURATION
// =======================================================

const DELIVERY_CONFIG_STORAGE_KEY = 'uzhavar_product_delivery_configs';

/**
 * Cleans the product description by removing hidden delivery configuration comments.
 */
export function cleanProductDescription(desc) {
  if (!desc || typeof desc !== 'string') return '';
  return desc.replace(/<!--\s*UM_DELIVERY:\s*\{.*?\}\s*-->/gi, '').trim();
}

/**
 * Parses delivery metadata embedded within the product description.
 */
export function parseDeliveryConfigFromDescription(desc) {
  if (!desc || typeof desc !== 'string') return null;
  const match = desc.match(/<!--\s*UM_DELIVERY:\s*(\{.*?\})\s*-->/i);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {}
  }
  return null;
}

/**
 * Appends delivery configuration metadata to the product description.
 */
export function formatProductDescriptionWithDelivery(desc, { minFreeQty, deliveryPrice }) {
  const base = cleanProductDescription(desc);
  const minQty = Math.max(1, Number(minFreeQty || 1));
  const delFee = Math.max(0, Number(deliveryPrice || 0));
  const metaTag = `\n<!-- UM_DELIVERY: {"minFreeQty": ${minQty}, "deliveryPrice": ${delFee}} -->`;
  return `${base}${metaTag}`;
}

/**
 * Persists the farmer's delivery configuration (minFreeQty & deliveryPrice)
 * so it works consistently across the client even if the DB column is pending migration.
 */
export function saveProductDeliveryConfig(productId, { minFreeQty, deliveryPrice }) {
  if (typeof window === 'undefined' || !productId) return;
  try {
    const raw = localStorage.getItem(DELIVERY_CONFIG_STORAGE_KEY);
    const registry = raw ? JSON.parse(raw) : {};
    registry[productId] = {
      minFreeQty: Number(minFreeQty) > 0 ? Number(minFreeQty) : 1,
      deliveryPrice: Number(deliveryPrice) >= 0 ? Number(deliveryPrice) : 0,
    };
    localStorage.setItem(DELIVERY_CONFIG_STORAGE_KEY, JSON.stringify(registry));
  } catch (err) {}
}

/**
 * Retrieves the persisted delivery configuration for a product.
 */
export function getProductDeliveryConfig(productId) {
  if (typeof window === 'undefined' || !productId) return null;
  try {
    const raw = localStorage.getItem(DELIVERY_CONFIG_STORAGE_KEY);
    const registry = raw ? JSON.parse(raw) : {};
    return registry[productId] || null;
  } catch (err) {
    return null;
  }
}

/**
 * Calculates delivery fee, whether order qualifies for free delivery,
 * and how many units are needed to unlock free delivery.
 * @param {object} product Product object
 * @param {number} quantity Selected quantity
 * @returns {{
 *   deliveryPrice: number,
 *   minFreeQty: number,
 *   isFreeDelivery: boolean,
 *   currentDeliveryFee: number,
 *   itemsNeededForFree: number,
 *   hasDeliveryFeeBelowMin: boolean
 * }}
 */
export function getDeliveryDetails(product, quantity = 1) {
  const descConfig = parseDeliveryConfigFromDescription(product?.description);
  const localConfig = getProductDeliveryConfig(product?.id);
  
  const deliveryPrice = Number(
    product?.delivery_price !== undefined && product?.delivery_price !== null && !isNaN(product?.delivery_price)
      ? product.delivery_price
      : (descConfig?.deliveryPrice ?? localConfig?.deliveryPrice ?? 0)
  );

  let minFreeQty = 1;
  const dbMin = Number(product?.min_free_delivery_qty);
  const descMin = Number(descConfig?.minFreeQty);
  const localMin = Number(localConfig?.minFreeQty);

  if (!isNaN(descMin) && descMin > 0) {
    minFreeQty = descMin;
  } else if (!isNaN(dbMin) && dbMin > 0) {
    minFreeQty = dbMin;
  } else if (!isNaN(localMin) && localMin > 0) {
    minFreeQty = localMin;
  }

  const qty = Number(quantity || 1);

  const hasDeliveryFeeBelowMin = deliveryPrice > 0 && minFreeQty > 1;
  const isFreeDelivery = deliveryPrice <= 0 || qty >= minFreeQty;
  const currentDeliveryFee = isFreeDelivery ? 0 : deliveryPrice;
  const itemsNeededForFree = Math.max(0, minFreeQty - qty);

  return {
    deliveryPrice,
    minFreeQty,
    isFreeDelivery,
    currentDeliveryFee,
    itemsNeededForFree,
    hasDeliveryFeeBelowMin,
  };
}
