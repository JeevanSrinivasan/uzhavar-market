'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '@/app/context/LanguageContext'
import LanguageToggle from '@/app/components/LanguageToggle'
import { getDeliveryDetails } from '@/lib/pricing'

export default function Checkout() {
  const router = useRouter()
  const { t } = useLanguage()

  const [cart, setCart] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [district, setDistrict] = useState('')
  const [village, setVillage] = useState('')

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkUserAndCart() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const guestCart = JSON.parse(localStorage.getItem('cart') || '[]')

        if (user) {
          if (guestCart.length > 0) {
            const userKey = `uzhavar_cart_${user.id}`
            const userCart = JSON.parse(localStorage.getItem(userKey) || '[]')

            guestCart.forEach((gItem) => {
              const idx = userCart.findIndex((u) => u.id === gItem.id)
              if (idx > -1) {
                userCart[idx].quantity = (Number(userCart[idx].quantity) || 1) + (Number(gItem.quantity) || 1)
              } else {
                userCart.push(gItem)
              }
            })
            localStorage.setItem(userKey, JSON.stringify(userCart))
            localStorage.removeItem('cart')
            window.dispatchEvent(new Event('cart-updated'))
          }
          router.replace('/customer/checkout')
          return
        }

        setCart(guestCart)

        if (guestCart.length === 0) {
          router.push('/cart')
        }
      } catch (err) {
        console.error('Checkout check error:', err)
      }
    }
    checkUserAndCart()
  }, [router])

  const totalAmount = cart.reduce((total, item) => {
    const deliveryInfo = getDeliveryDetails(item, item.quantity || 1)
    return total + (Number(item.price) * item.quantity) + deliveryInfo.currentDeliveryFee
  }, 0)

  const totalDelivery = cart.reduce((total, item) => {
    const deliveryInfo = getDeliveryDetails(item, item.quantity || 1)
    return total + deliveryInfo.currentDeliveryFee
  }, 0)

  async function handlePlaceOrder(e) {
    e.preventDefault()

    if (
      !name ||
      !phone ||
      !address ||
      !district ||
      !village
    ) {
      alert(t('checkout.errAllFields'))
      return
    }

    if (cart.length === 0) {
      alert(t('cart.cartEmptyAlert'))
      return
    }

    setLoading(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        alert(t('home.loginToBuy'))
        router.push('/login')
        return
      }

      const productIds = cart.map((item) => item.id)

      const { data: products, error: productsError } =
        await supabase
          .from('products')
          .select(`
            id,
            name,
            farmer_id,
            price,
            commission_amount,
            unit,
            stock_quantity,
            status,
            approval_status
          `)
          .in('id', productIds)
          .eq('status', 'active')
          .eq('approval_status', 'active')

      if (productsError) {
        console.error('PRODUCT FETCH ERROR:', productsError)
        alert(t('common.somethingWentWrong'))
        return
      }

      if (!products || products.length !== cart.length) {
        alert(t('productView.productRemovedNotice'))
        return
      }

      const productMap = new Map(
        products.map((product) => [
          product.id,
          product,
        ])
      )

      const orderItems = []
      let calculatedTotal = 0

      for (const cartItem of cart) {
        const product = productMap.get(cartItem.id)

        if (!product) {
          alert(`${cartItem.name} - ${t('productView.productNotFound')}`)
          return
        }

        const quantity = Number(cartItem.quantity)

        if (!Number.isFinite(quantity) || quantity <= 0) {
          alert(`${product.name} - Invalid quantity`)
          return
        }

        if (Number(product.stock_quantity) < quantity) {
          alert(t('home.stockLimitAlert', { stock: product.stock_quantity, unit: product.unit }))
          return
        }

        const farmerPrice = Number(product.price)
        const commissionAmount = Number(product.commission_amount || 0)
        const customerPrice = farmerPrice + commissionAmount
        const minFreeQty = Number(product.min_free_delivery_qty || cartItem.min_free_delivery_qty || 1)
        const deliveryFee = quantity >= minFreeQty ? 0 : Number(product.delivery_price || cartItem.delivery_price || 0)
        const itemTotal = (customerPrice * quantity) + deliveryFee

        calculatedTotal += itemTotal

        orderItems.push({
          product_id: product.id,
          farmer_id: product.farmer_id,
          product_name: product.name,
          price: customerPrice,
          quantity: quantity,
          unit: product.unit,
          item_total: itemTotal,
          farmer_price: farmerPrice,
          commission_amount: commissionAmount,
          settlement_status: 'pending',
          settlement_amount: farmerPrice * quantity,
          settlement_paid_at: null,
        })
      }

      const { data: order, error: orderError } =
        await supabase
          .from('orders')
          .insert({
            customer_id: user.id,
            customer_name: name,
            customer_phone: phone,
            delivery_address: address,
            district: district,
            village: village,
            total_amount: calculatedTotal,
            order_status: 'pending',
            payment_status: 'pending',
          })
          .select()
          .single()

      if (orderError) {
        console.error('ORDER ERROR:', orderError)
        alert(t('common.somethingWentWrong'))
        return
      }

      const finalOrderItems = orderItems.map((item) => ({
        ...item,
        order_id: order.id,
      }))

      const { error: itemsError } =
        await supabase
          .from('order_items')
          .insert(finalOrderItems)

      if (itemsError) {
        console.error('ORDER ITEMS ERROR:', itemsError)
        await supabase
          .from('orders')
          .delete()
          .eq('id', order.id)

        alert(t('common.somethingWentWrong'))
        return
      }

      // Deduct stock for each purchased item
      for (const item of cart) {
        try {
          const { data: prod } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.id)
            .single()

          if (prod && prod.stock_quantity !== null && prod.stock_quantity !== undefined) {
            const newStock = Math.max(0, Number(prod.stock_quantity) - Number(item.quantity || 1))
            await supabase
              .from('products')
              .update({ stock_quantity: newStock })
              .eq('id', item.id)
          }
        } catch (stockErr) {
          console.error('Failed to deduct stock for product:', item.id, stockErr)
        }
      }

      localStorage.removeItem('cart')
      window.dispatchEvent(new Event('cart-updated'))
      setCart([])

      alert(`${t('orderSuccess.title')}\nOrder ID: ${order.id}`)

      router.push('/')
    } catch (error) {
      console.error('CHECKOUT ERROR:', error)
      alert(t('common.somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7f5] py-8 px-4 sm:py-10 sm:px-6">
      <div className="max-w-5xl mx-auto w-full">

        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push('/cart')}
            className="text-gray-600 hover:text-gray-900 font-medium text-sm sm:text-base cursor-pointer"
          >
            ← {t('checkout.backToCart')}
          </button>
          <LanguageToggle />
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8 text-gray-800">
          {t('checkout.title')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">

          {/* Customer Details */}
          <section className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100">

            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-5 text-gray-800">
              {t('checkout.deliveryDetails')}
            </h2>

            <form onSubmit={handlePlaceOrder}>

              <label className="block mb-2 font-semibold text-gray-700 text-sm sm:text-base">
                {t('checkout.fullName')}
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('checkout.fullNamePlaceholder')}
                className="w-full p-3 mb-4 sm:mb-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none"
              />

              <label className="block mb-2 font-semibold text-gray-700 text-sm sm:text-base">
                {t('checkout.phoneNumber')}
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('checkout.phonePlaceholder')}
                className="w-full p-3 mb-4 sm:mb-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none"
              />

              <label className="block mb-2 font-semibold text-gray-700 text-sm sm:text-base">
                {t('checkout.streetAddress')}
              </label>

              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t('checkout.streetPlaceholder')}
                rows="4"
                className="w-full p-3 mb-4 sm:mb-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none resize-y"
              />

              <label className="block mb-2 font-semibold text-gray-700 text-sm sm:text-base">
                {t('checkout.district')}
              </label>

              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={t('checkout.districtPlaceholder')}
                className="w-full p-3 mb-4 sm:mb-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none"
              />

              <label className="block mb-2 font-semibold text-gray-700 text-sm sm:text-base">
                {t('checkout.villageTown')}
              </label>

              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder={t('checkout.villagePlaceholder')}
                className="w-full p-3 mb-4 sm:mb-5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none"
              />

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 mb-3">
                <strong>{t('checkout.paymentTitle')}</strong>
                <p className="m-0 mt-0.5 text-emerald-800">{t('checkout.paymentDesc')}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-4">
                <strong>{t('checkout.logisticsTitle')}</strong>
                <p className="m-0 mt-0.5 text-blue-800">{t('checkout.logisticsDesc')}</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full p-3 sm:p-4 bg-green-800 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-70 transition-colors mt-2"
              >
                {loading
                  ? t('checkout.placingOrder')
                  : t('checkout.placeOrderSimple')}
              </button>

            </form>

          </section>

          {/* Order Summary */}
          <section className="lg:col-span-1 bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-gray-100 lg:sticky lg:top-8">

            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-5 text-gray-800">
              {t('checkout.orderSummary')}
            </h2>

            <div className="flex flex-col">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 py-4 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <strong className="text-gray-800">{item.name}</strong>
                    <p className="mt-1 text-sm text-gray-500">
                      ₹{item.price} × {item.quantity}
                    </p>
                  </div>

                  <strong className="text-gray-800">
                    ₹{(Number(item.price) * item.quantity).toFixed(2)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="flex justify-between py-2 text-gray-600 text-sm">
              <span>{t('checkout.delivery')}</span>
              <span className={totalDelivery === 0 ? 'text-green-700 font-semibold' : 'text-gray-900 font-medium'}>
                {totalDelivery === 0 ? t('checkout.free') : `+₹${totalDelivery.toFixed(2)}`}
              </span>
            </div>

            <div className="my-5 border-t border-gray-200"></div>

            <div className="flex justify-between text-lg sm:text-xl font-bold text-gray-800">
              <span>{t('checkout.total')}</span>
              <strong>₹{totalAmount.toFixed(2)}</strong>
            </div>

          </section>

        </div>

      </div>
    </main>
  )
}
