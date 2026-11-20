"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import LanguageToggle from "@/app/components/LanguageToggle";
import { getProductPricing, getDeliveryDetails, cleanProductDescription } from "@/lib/pricing";

const Icons = {
  Back: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Cart: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>,
  User: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Heart: ({ className, filled }) => <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  Share: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>,
  Leaf: ({ className }) => <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  Shield: ({ className }) => <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  Plant: ({ className }) => <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  Truck: ({ className }) => <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="15" height="13" x="1" y="8" rx="2" ry="2"/><path d="M16 8h2.55a2 2 0 0 1 1.95 1.57l1.5 6A2 2 0 0 1 20 18h-4"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="18.5" r="2.5"/></svg>,
  Star: ({ filled, half, className }) => (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#fbbf24" : (half ? "url(#half)" : "none")} stroke={filled || half ? "#fbbf24" : "#d1d5db"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {half && (
        <defs>
          <linearGradient id="half">
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  ChevronRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
};

function formatTimeAgo(dateString, t) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return t('productView.justNow');
  if (diffInSeconds < 3600) return t('productView.minutesAgo', { n: Math.floor(diffInSeconds / 60) });
  if (diffInSeconds < 86400) return t('productView.hoursAgo', { n: Math.floor(diffInSeconds / 3600) });
  if (diffInSeconds < 604800) return t('productView.daysAgo', { n: Math.floor(diffInSeconds / 86400) });
  return t('productView.weeksAgo', { n: Math.floor(diffInSeconds / 604800) });
}

export default function ProductView({
  product,
  farmerName,
  categoryName,
  reviews = [],
  price,
  stock,
  onAddToCart,
  userId
}) {
  const router = useRouter();
  const { t, tc, tu } = useLanguage();
  
  const isOrganicComplex = product?.name?.toLowerCase().includes('organic complex');
  const minQty = isOrganicComplex ? 50 : 1;
  const [quantity, setQuantity] = useState(minQty);
  
  const pricing = getProductPricing({
    ...product,
    price: price !== undefined ? price : product?.price,
    commission_amount: 0,
  });

  const [cartCount, setCartCount] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imagesList = product?.images?.length > 0 ? product.images : (product?.image_url ? [product.image_url] : []);

  useEffect(() => {
    const updateCount = () => {
      try {
        const cartKey = userId ? `uzhavar_cart_${userId}` : 'cart';
        const cart = JSON.parse(localStorage.getItem(cartKey) || "[]");
        let count = 0;
        cart.forEach(item => count += (item.quantity || 1));
        setCartCount(count);
      } catch (e) {}
    };

    updateCount();
    window.addEventListener('storage', updateCount);
    window.addEventListener('cart-updated', updateCount);

    if (userId) {
      const wishlistKey = `uzhavar_wishlist_${userId}`;
      try {
        const wishlist = JSON.parse(localStorage.getItem(wishlistKey) || "[]");
        if (wishlist.some(item => String(item.id) === String(product?.id))) {
          setIsLiked(true);
        }
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('cart-updated', updateCount);
    };
  }, [userId, product?.id]);

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'buyNow' | 'addToCart'

  const deliveryInfo = getDeliveryDetails(product, quantity);

  const decreaseQty = () => { if (quantity > minQty) setQuantity(q => q - 1); };
  const increaseQty = () => { if (quantity < stock) setQuantity(q => q + 1); };

  const handleAdd = () => {
    if (deliveryInfo.hasDeliveryFeeBelowMin && quantity < deliveryInfo.minFreeQty) {
      setPendingAction('addToCart');
      setDeliveryModalOpen(true);
      return;
    }
    onAddToCart(quantity, { deliveryFee: 0, minFreeQty: deliveryInfo.minFreeQty });
    setCartCount(prev => prev + quantity);
  };

  const handleBuyNow = () => {
    if (deliveryInfo.hasDeliveryFeeBelowMin && quantity < deliveryInfo.minFreeQty) {
      setPendingAction('buyNow');
      setDeliveryModalOpen(true);
      return;
    }
    onAddToCart(quantity, { deliveryFee: 0, minFreeQty: deliveryInfo.minFreeQty });
    router.push(userId ? '/customer/checkout' : '/login');
  };

  const handleChooseOption1 = () => {
    const targetQty = deliveryInfo.minFreeQty;
    setQuantity(targetQty);
    onAddToCart(targetQty, {
      deliveryFee: 0,
      minFreeQty: deliveryInfo.minFreeQty,
    });
    setCartCount(prev => prev + targetQty);
    setDeliveryModalOpen(false);
    if (pendingAction === 'buyNow') {
      router.push(userId ? '/customer/checkout' : '/login');
    }
  };

  const handleChooseOption2 = () => {
    onAddToCart(quantity, {
      deliveryFee: deliveryInfo.deliveryPrice,
      minFreeQty: deliveryInfo.minFreeQty,
    });
    setCartCount(prev => prev + quantity);
    setDeliveryModalOpen(false);
    if (pendingAction === 'buyNow') {
      router.push(userId ? '/customer/checkout' : '/login');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: t('productView.shareText', { name: product?.name }),
          url: url,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(url);
      alert(t('productView.linkCopied'));
    }
  };

  const toggleWishlist = () => {
    if (!userId) {
      alert(t('productView.loginWishlist'));
      router.push("/login");
      return;
    }
    const wishlistKey = `uzhavar_wishlist_${userId}`;
    try {
      let wishlist = JSON.parse(localStorage.getItem(wishlistKey) || "[]");
      if (isLiked) {
        wishlist = wishlist.filter(item => String(item.id) !== String(product.id));
        setIsLiked(false);
      } else {
        wishlist.push({
          id: product.id,
          name: product.name,
          image_url: product.image_url,
          price,
          unit: product.unit,
          farmer_name: farmerName,
          category_name: categoryName
        });
        setIsLiked(true);
      }
      localStorage.setItem(wishlistKey, JSON.stringify(wishlist));
    } catch (e) {}
  };

  const avgRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length 
    : 0;

  const starCounts = {5:0, 4:0, 3:0, 2:0, 1:0};
  reviews.forEach(r => {
    if (r.rating && starCounts[r.rating] !== undefined) {
      starCounts[r.rating]++;
    }
  });

  const translatedUnit = tu(product.unit || 'unit');

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <div className="max-w-[480px] md:max-w-7xl mx-auto bg-white min-h-screen sm:shadow-lg sm:border-x sm:border-gray-200 relative pb-24 md:pb-12">
        
        {/* Header */}
        <header className="flex items-center justify-between p-3 bg-[#115e59] text-white sticky top-0 z-20 gap-2">
          <button onClick={() => router.back()} className="p-1 hover:bg-white/10 rounded-full cursor-pointer shrink-0">
            <Icons.Back />
          </button>
          
          <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => router.push('/')}>
             <div className="text-xl">🌾</div>
             <div className="font-bold whitespace-nowrap hidden sm:block">{t('brand')}</div>
          </div>
          
          <div className="flex-1 max-w-[180px] hidden sm:block">
            <div className="relative">
              <input type="text" placeholder={t('productView.searchPlaceholder')} className="w-full pl-8 pr-3 py-1.5 rounded bg-white text-gray-800 text-sm outline-none" />
              <div className="absolute left-2 top-1.5 text-gray-500"><Icons.Search /></div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <LanguageToggle variant="dark" />
            <button className="relative p-1 hover:bg-white/10 rounded-full cursor-pointer" onClick={() => router.push(userId ? '/customer/wishlist' : '/login')}>
              <Icons.Heart />
            </button>
            <button className="relative p-1 hover:bg-white/10 rounded-full cursor-pointer" onClick={() => router.push(userId ? '/customer/cart' : '/cart')}>
              <Icons.Cart />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {cartCount}
                </span>
              )}
            </button>
            <button className="p-1 hover:bg-white/10 rounded-full cursor-pointer" onClick={() => router.push(userId ? '/customer' : '/login')}>
              <Icons.User />
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 md:flex md:gap-8 lg:gap-12 items-start">
          {/* Left Column: Images */}
          <div className="w-full md:w-[55%] lg:w-[60%]">
            {/* MOBILE VIEW (Carousel) */}
            <div className="md:hidden relative rounded-xl overflow-hidden bg-[#f0fdf4] aspect-[4/3] mb-6 flex items-center justify-center group shadow-sm border border-gray-100">
            {imagesList.length > 0 ? (
              <>
                <img src={imagesList[currentImageIndex]} alt={product?.name} className="w-full h-full object-cover transition-all duration-300" />
                
                {imagesList.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentImageIndex(prev => prev === 0 ? imagesList.length - 1 : prev - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icons.Back />
                    </button>
                    <button 
                      onClick={() => setCurrentImageIndex(prev => prev === imagesList.length - 1 ? 0 : prev + 1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity rotate-180"
                    >
                      <Icons.Back />
                    </button>
                    
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {imagesList.map((_, idx) => (
                        <div key={idx} className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'border border-white bg-white/30'}`}></div>
                      ))}
                    </div>
                    <div className="absolute bottom-3 left-4 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                      {currentImageIndex + 1}/{imagesList.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <span className="text-6xl">🌱</span>
            )}
            <span className="absolute top-3 left-3 bg-[#166534] text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
              <Icons.Leaf className="w-3 h-3" /> {t('productView.organic')}
            </span>
            {pricing.discountPercent > 0 && (
              <span className="absolute top-3 left-28 bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-md">
                {pricing.discountPercent}% {t('common.off')}
              </span>
            )}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <button onClick={toggleWishlist} className="bg-white p-2.5 rounded-full shadow-sm text-gray-700 hover:text-red-500 cursor-pointer transition-colors">
                <Icons.Heart filled={isLiked} className={isLiked ? "fill-red-500 text-red-500" : ""} />
              </button>
              <button onClick={handleShare} className="bg-white p-2.5 rounded-full shadow-sm text-gray-700 hover:text-blue-500 cursor-pointer transition-colors">
                <Icons.Share />
              </button>
            </div>
          </div>

            {/* DESKTOP VIEW (Grid) */}
            <div className="hidden md:grid md:grid-cols-2 gap-4 mb-6">
              {imagesList.length > 0 ? (
                imagesList.map((img, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden bg-[#f0fdf4] aspect-[3/4] flex items-center justify-center border border-gray-100">
                    <img src={img} alt={`${product?.name} ${idx+1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <>
                        <span className="absolute top-3 left-3 bg-[#166534] text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
                          <Icons.Leaf className="w-3 h-3" /> {t('productView.organic')}
                        </span>
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          <button onClick={toggleWishlist} className="bg-white p-2.5 rounded-full shadow-sm text-gray-700 hover:text-red-500 cursor-pointer transition-colors">
                            <Icons.Heart filled={isLiked} className={isLiked ? "fill-red-500 text-red-500" : ""} />
                          </button>
                          <button onClick={handleShare} className="bg-white p-2.5 rounded-full shadow-sm text-gray-700 hover:text-blue-500 cursor-pointer transition-colors">
                            <Icons.Share />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-[#f0fdf4] aspect-[3/4] flex items-center justify-center border border-gray-100 col-span-2">
                  <span className="text-6xl">🌱</span>
                  <span className="absolute top-3 left-3 bg-[#166534] text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
                    <Icons.Leaf className="w-3 h-3" /> {t('productView.organic')}
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Product Details */}
          <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col md:sticky md:top-24">
            {/* Title & Info */}
            <div className="mb-1 text-sm text-gray-500">{farmerName}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{product.name}</h1>
          
          <div className="inline-flex bg-green-50 text-green-800 text-xs px-2.5 py-1 rounded-full mb-3 font-medium items-center gap-1 self-start">
             <Icons.Leaf className="w-3 h-3"/> {tc(categoryName || 'Product')}
          </div>

          <div className="flex items-center gap-2 mb-4">
             <div className="flex gap-0.5">
               {[1,2,3,4,5].map(i => (
                 <Icons.Star key={i} className="w-4 h-4" filled={i <= Math.floor(avgRating)} half={i === Math.ceil(avgRating) && !Number.isInteger(avgRating)} />
               ))}
             </div>
             <span className="text-sm font-bold text-blue-600">{avgRating.toFixed(1)}</span>
             <span className="text-sm text-gray-500">{t('productView.reviewsCount', { count: reviews.length })}</span>
          </div>

          <div className="flex items-baseline gap-2.5 mb-1 flex-wrap">
            <span className="text-3xl sm:text-4xl font-bold text-[#166534]">
              ₹{Number(price || pricing.sellingPrice || 0).toFixed(2)}
            </span>
            {pricing.discountPercent > 0 && (
              <>
                <span className="text-base sm:text-lg text-gray-400 line-through font-medium">
                  {t('common.mrp')}: ₹{pricing.marketPrice.toFixed(2)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                  {pricing.discountPercent}% {t('common.off')}
                </span>
              </>
            )}
            <span className="text-gray-500 font-medium mb-1.5">/ {translatedUnit}</span>
          </div>

          {pricing.discountPercent > 0 && (
            <div className="text-xs sm:text-sm text-emerald-800 font-medium mb-3 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-fit">
              <span>🏷️</span>
              <span className="font-bold">
                {t('common.directSavings', {
                  amount: pricing.savingsAmount.toFixed(0),
                  percent: pricing.discountPercent,
                })}
              </span>
              <span className="text-gray-500 text-xs">
                ({t('common.marketRateNotice', { amount: pricing.marketPrice.toFixed(0) })})
              </span>
            </div>
          )}
          
          <div className="text-sm text-[#166534] font-bold mb-4 flex items-center gap-1.5">
            <Icons.Leaf className="w-3.5 h-3.5 fill-current" /> {t('productView.availableWithUnit', { stock, unit: translatedUnit })}
          </div>

          {/* Delivery Status Banner */}
          {deliveryInfo.deliveryPrice > 0 && (
            deliveryInfo.isFreeDelivery ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-xs sm:text-sm text-green-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎉</span>
                  <div>
                    <strong className="block text-green-800">{t('productView.freeDeliveryEligible')}</strong>
                    <span className="text-xs text-green-700">
                      {t('productView.freeDeliveryThresholdNotice', { min: deliveryInfo.minFreeQty, unit: translatedUnit })}
                    </span>
                  </div>
                </div>
                <span className="bg-green-600 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                  FREE
                </span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs sm:text-sm text-amber-900">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <span>🚚</span>
                    <span>{t('productView.deliveryFeeNotice', { fee: deliveryInfo.deliveryPrice, min: deliveryInfo.minFreeQty, unit: translatedUnit })}</span>
                  </div>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    +₹{deliveryInfo.deliveryPrice}
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1 flex items-center gap-1 font-medium">
                  <span>💡</span>
                  <span>{t('productView.orderMoreForFree', { count: `${deliveryInfo.itemsNeededForFree} ${translatedUnit}` })}</span>
                </p>
              </div>
            )
          )}

          <div className="flex flex-col gap-3 mb-6">
            <div className="flex gap-3">
              <div className="flex items-center border border-gray-300 rounded-xl bg-white overflow-hidden w-[120px] shrink-0 h-[48px]">
                <button onClick={decreaseQty} className="flex-1 h-full flex items-center justify-center text-gray-600 text-xl hover:bg-gray-50 cursor-pointer">−</button>
                <span className="flex-1 text-center font-bold text-gray-900">{quantity}</span>
                <button onClick={increaseQty} className="flex-1 h-full flex items-center justify-center text-gray-600 text-xl hover:bg-gray-50 cursor-pointer">+</button>
              </div>
              <button 
                onClick={handleAdd} 
                disabled={stock <= 0}
                className={`flex-1 rounded-xl font-bold flex items-center justify-center gap-2 h-[48px] transition-colors ${stock > 0 ? 'bg-[#166534] text-white hover:bg-green-900 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                <Icons.Cart className="w-5 h-5"/> {t('productView.addToCart')}
              </button>
            </div>
            <button 
              onClick={handleBuyNow} 
              disabled={stock <= 0}
              className={`w-full rounded-xl font-bold flex items-center justify-center gap-2 h-[48px] transition-colors ${stock > 0 ? 'bg-[#f59e0b] text-white hover:bg-[#d97706] cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            >
              {t('productView.buyNow')}
            </button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-4 gap-2 mb-6 border border-gray-100 rounded-xl p-4 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col items-center justify-center text-center gap-1.5">
              <Icons.Leaf className="w-6 h-6 text-gray-600"/>
              <span className="text-[10px] text-gray-600 font-medium">{t('productView.featOrganic')}</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center gap-1.5">
              <Icons.Shield className="w-6 h-6 text-gray-600"/>
              <span className="text-[10px] text-gray-600 font-medium">{t('productView.featSoil')}</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center gap-1.5">
              <Icons.Plant className="w-6 h-6 text-gray-600"/>
              <span className="text-[10px] text-gray-600 font-medium">{t('productView.featYield')}</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center gap-1.5">
              <Icons.Truck className="w-6 h-6 text-gray-600"/>
              <span className="text-[10px] text-gray-600 font-medium">{t('productView.featDelivery')}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-2 text-base">{t('productView.descriptionTitle')}</h3>
            <p className={`text-sm text-gray-600 leading-relaxed ${descExpanded ? '' : 'line-clamp-3'}`}>
              {cleanProductDescription(product.description) || t('productView.defaultDesc')}
            </p>
            {descExpanded && (!product.description || product.description.length < 100) && (
              <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc pl-4">
                <li>{t('productView.defaultBullet1')}</li>
                <li>{t('productView.defaultBullet2')}</li>
                <li>{t('productView.defaultBullet3')}</li>
              </ul>
            )}
            <button 
              onClick={() => setDescExpanded(!descExpanded)} 
              className="text-[#166534] text-sm font-bold flex items-center gap-1 mt-2 cursor-pointer"
            >
              {descExpanded ? t('productView.readLess') : t('productView.readMore')} <Icons.ChevronDown />
            </button>
          </div>

          {/* Reviews */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] mb-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base">{t('productView.customerReviews')}</h3>
              {reviews.length > 0 && <button className="text-sm text-gray-500 font-medium flex items-center gap-0.5 cursor-pointer">{t('productView.seeAll')} <Icons.ChevronRight /></button>}
            </div>

            <div className="p-4">
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">{t('productView.noReviewsYet')}</p>
              ) : (
                <>
                  <div className="flex gap-6 mb-6 items-center">
                    <div className="flex flex-col items-center justify-center w-24">
                      <span className="text-4xl font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                      <div className="flex gap-0.5 my-1">
                        {[1,2,3,4,5].map(i => (
                          <Icons.Star key={i} className="w-3.5 h-3.5" filled={i <= Math.floor(avgRating)} half={i === Math.ceil(avgRating) && !Number.isInteger(avgRating)} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{t('productView.reviewsCount', { count: reviews.length })}</span>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-1.5">
                      {[5,4,3,2,1].map(star => (
                         <div key={star} className="flex items-center gap-2 text-xs font-medium text-gray-600">
                            <span className="w-4">{star} ★</span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                               <div className="h-full bg-[#166534] rounded-full" style={{width: `${(starCounts[star]/reviews.length)*100}%`}}></div>
                            </div>
                            <span className="w-5 text-right text-gray-500">{starCounts[star]}</span>
                         </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {reviews.slice(0, 3).map(review => (
                       <div key={review.id} className="border-t border-gray-100 pt-4">
                         <div className="flex gap-3 mb-2">
                           <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 shrink-0">
                             <Icons.User />
                           </div>
                           <div>
                             <div className="flex items-center gap-2">
                               <span className="font-bold text-sm text-gray-900">{review.profiles?.full_name || 'Customer'}</span>
                               <span className="text-[10px] text-[#166534] font-bold flex items-center gap-0.5"><Icons.Shield className="w-3 h-3"/> {t('productView.verifiedBuyer')}</span>
                             </div>
                             <div className="flex items-center gap-2 mt-0.5">
                               <div className="flex gap-0.5">
                                 {[1,2,3,4,5].map(i => (
                                   <Icons.Star key={i} className="w-3 h-3" filled={i <= (review.rating || 0)} />
                                 ))}
                               </div>
                               <span className="text-xs text-gray-400 font-medium">• {formatTimeAgo(review.created_at, t)}</span>
                             </div>
                           </div>
                         </div>
                         <p className="text-sm text-gray-700 leading-relaxed ml-13">
                           {review.review_text}
                         </p>
                       </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          CUSTOMER DELIVERY OPTIONS MODAL (BELOW MIN QTY)
      ===================================================== */}
      {deliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setDeliveryModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer text-lg font-bold"
              title={t('common.close')}
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shrink-0">
                🚚
              </div>
              <div className="pr-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 m-0">
                  {t('productView.deliveryOptionsModalTitle')}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 m-0 mt-0.5 truncate max-w-[280px] sm:max-w-[340px]">
                  {product?.name}
                </p>
              </div>
            </div>

            {/* Subtitle / notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs sm:text-sm text-amber-900 leading-relaxed">
              <p className="font-semibold m-0">
                {t('productView.currentSelectionNotice', {
                  qty: quantity,
                  min: deliveryInfo.minFreeQty,
                  unit: translatedUnit,
                })}
              </p>
              <p className="m-0 mt-1 text-xs text-amber-800">
                {t('productView.deliveryOptionsSubtitle', {
                  min: deliveryInfo.minFreeQty,
                  unit: translatedUnit,
                })}
              </p>
            </div>

            {/* Two Options Cards */}
            <div className="space-y-3.5 mb-5">
              {/* Option 1: Minimum Quantity - Free Delivery */}
              <div className="border-2 border-green-600 bg-green-50/70 rounded-xl p-4 transition-all hover:bg-green-50 relative">
                <span className="absolute -top-2.5 right-4 bg-green-700 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide shadow-sm">
                  ★ RECOMMENDED
                </span>
                <div className="flex justify-between items-start mb-1.5">
                  <h4 className="font-bold text-green-900 text-sm sm:text-base m-0">
                    {t('productView.option1CardTitle')}
                  </h4>
                </div>
                <p className="text-xs text-green-800 mb-3 leading-relaxed">
                  {t('productView.option1CardDesc', {
                    min: deliveryInfo.minFreeQty,
                    unit: translatedUnit,
                    amount: (price * deliveryInfo.minFreeQty).toFixed(2),
                  })}
                </p>
                <div className="bg-white/95 rounded-lg p-2.5 border border-green-200 mb-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-gray-600">{deliveryInfo.minFreeQty} {translatedUnit} x ₹{price.toFixed(2)}</span>
                    <strong className="block text-green-900 text-sm">Total: ₹{(price * deliveryInfo.minFreeQty).toFixed(2)}</strong>
                  </div>
                  <span className="bg-green-100 text-green-800 font-bold px-2 py-1 rounded text-[11px]">
                    {t('productView.option1SavingsBadge', { fee: deliveryInfo.deliveryPrice })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleChooseOption1}
                  className="w-full py-2.5 px-4 bg-green-700 hover:bg-green-800 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  {t('productView.option1SelectBtn', {
                    min: deliveryInfo.minFreeQty,
                    unit: translatedUnit,
                  })}
                </button>
              </div>

              {/* Option 2: Current Quantity + Delivery Fee */}
              <div className="border border-gray-300 bg-gray-50 rounded-xl p-4 transition-all hover:bg-gray-100/80">
                <h4 className="font-bold text-gray-800 text-sm sm:text-base m-0 mb-1">
                  {t('productView.option2CardTitle')}
                </h4>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  {t('productView.option2CardDesc', {
                    qty: quantity,
                    unit: translatedUnit,
                    subtotal: (price * quantity).toFixed(2),
                    fee: deliveryInfo.deliveryPrice.toFixed(2),
                    total: (price * quantity + deliveryInfo.deliveryPrice).toFixed(2),
                  })}
                </p>
                <div className="bg-white rounded-lg p-2.5 border border-gray-200 mb-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-gray-500">{quantity} {translatedUnit} (₹{(price * quantity).toFixed(2)}) + Shipping (₹{deliveryInfo.deliveryPrice.toFixed(2)})</span>
                    <strong className="block text-gray-900 text-sm">Total: ₹{(price * quantity + deliveryInfo.deliveryPrice).toFixed(2)}</strong>
                  </div>
                  <span className="bg-gray-100 text-gray-700 font-semibold px-2 py-1 rounded text-[11px]">
                    +₹{deliveryInfo.deliveryPrice} Shipping
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleChooseOption2}
                  className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {t('productView.option2SelectBtn', { fee: deliveryInfo.deliveryPrice })}
                </button>
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setDeliveryModalOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium underline cursor-pointer"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
