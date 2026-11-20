'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { detectTNMarketRate, saveApprovedMarketPrice, cleanProductDescription } from '@/lib/pricing'

export default function AdminProducts() {
  const router = useRouter()

  const [products, setProducts] = useState([])
  const [farmers, setFarmers] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const [editingCommissionId, setEditingCommissionId] =
    useState(null)

  const [commissionValue, setCommissionValue] =
    useState('')

  const [savingCommission, setSavingCommission] =
    useState(false)

  const [updatingId, setUpdatingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [manualRateModal, setManualRateModal] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setMessage('')
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.replace('/login')
      return
    }

    const { data: profile, error: profileError } =
      await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (
      profileError ||
      !profile ||
      profile.role !== 'admin'
    ) {
      router.replace('/')
      return
    }

    const {
      data: productData,
      error: productError,
    } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (productError) {
      console.log('PRODUCT ERROR:', productError)
      setError('Unable to load products.')
      setProducts([])
      setLoading(false)
      setRefreshing(false)
      return
    }

    setProducts(productData || [])

    const farmerIds = [
      ...new Set(
        (productData || [])
          .map((product) => product.farmer_id)
          .filter(Boolean)
      ),
    ]

    if (farmerIds.length > 0) {
      const {
        data: farmerData,
        error: farmerError,
      } = await supabase
        .from('profiles')
        .select('id, full_name, farm_name, phone')
        .in('id', farmerIds)

      if (farmerError) {
        console.log('FARMER ERROR:', farmerError)
      }

      const farmerMap = {}

      ;(farmerData || []).forEach((farmer) => {
        farmerMap[farmer.id] = farmer
      })

      setFarmers(farmerMap)
    } else {
      setFarmers({})
    }

    setLoading(false)
    setRefreshing(false)
  }

  const stats = useMemo(() => {
    const total = products.length

    const active = products.filter(
      (product) => product.status === 'active'
    ).length

    const pending = products.filter(
      (product) =>
        product.approval_status === 'pending'
    ).length

    const rejected = products.filter(
      (product) =>
        product.approval_status === 'rejected'
    ).length

    const inactive = products.filter(
      (product) => product.status !== 'active'
    ).length

    return {
      total,
      active,
      pending,
      rejected,
      inactive,
    }
  }, [products])

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return products.filter((product) => {
      const farmer = farmers[product.farmer_id]

      const matchesSearch =
        !keyword ||
        product.name
          ?.toLowerCase()
          .includes(keyword) ||
        product.description
          ?.toLowerCase()
          .includes(keyword) ||
        farmer?.full_name
          ?.toLowerCase()
          .includes(keyword) ||
        farmer?.farm_name
          ?.toLowerCase()
          .includes(keyword)

      let matchesFilter = true

      if (filter === 'active') {
        matchesFilter = product.status === 'active'
      }

      if (filter === 'inactive') {
        matchesFilter = product.status !== 'active'
      }

      if (filter === 'pending') {
        matchesFilter =
          product.approval_status === 'pending'
      }

      if (filter === 'approved') {
        matchesFilter =
          product.approval_status === 'active'
      }

      if (filter === 'rejected') {
        matchesFilter =
          product.approval_status === 'rejected'
      }

      return matchesSearch && matchesFilter
    })
  }, [products, farmers, search, filter])

  function getFarmer(product) {
    return farmers[product.farmer_id] || null
  }

  function getCustomerPrice(product) {
    const farmerPrice = Number(product.price || 0)
    const commission = Number(
      product.commission_amount || 0
    )

    return farmerPrice + commission
  }

  function getApprovalLabel(status) {
    if (status === 'active') return '✓ Approved'
    if (status === 'pending') return '⏳ Pending'
    if (status === 'rejected') return '✕ Rejected'

    return '— Not Set'
  }

  function getApprovalStyle(status) {
    if (status === 'active') {
      return 'bg-green-100 text-green-800 py-1.5 px-2.5 rounded-full text-xs font-bold whitespace-nowrap absolute top-3 right-3 shadow-sm'
    }

    if (status === 'pending') {
      return 'bg-amber-100 text-amber-900 py-1.5 px-2.5 rounded-full text-xs font-bold whitespace-nowrap absolute top-3 right-3 shadow-sm'
    }

    if (status === 'rejected') {
      return 'bg-red-100 text-red-700 py-1.5 px-2.5 rounded-full text-xs font-bold whitespace-nowrap absolute top-3 right-3 shadow-sm'
    }

    return 'bg-gray-100 text-gray-600 py-1.5 px-2.5 rounded-full text-xs font-bold whitespace-nowrap absolute top-3 right-3 shadow-sm'
  }

  function startCommissionEdit(product) {
    setEditingCommissionId(product.id)

    setCommissionValue(
      product.commission_amount ?? 0
    )

    setMessage('')
    setError('')
  }

  function cancelCommissionEdit() {
    setEditingCommissionId(null)
    setCommissionValue('')
  }

  async function saveCommission(product) {
    const value = Number(commissionValue)

    if (
      commissionValue === '' ||
      Number.isNaN(value) ||
      value < 0
    ) {
      setError(
        'Please enter a valid commission amount.'
      )
      return
    }

    setSavingCommission(true)
    setError('')
    setMessage('')

    const { error: updateError } =
      await supabase
        .from('products')
        .update({
          commission_amount: value,
        })
        .eq('id', product.id)

    if (updateError) {
      console.log(
        'COMMISSION UPDATE ERROR:',
        updateError
      )

      setError(
        'Unable to update commission amount.'
      )

      setSavingCommission(false)
      return
    }

    setProducts((currentProducts) =>
      currentProducts.map((item) =>
        item.id === product.id
          ? {
              ...item,
              commission_amount: value,
            }
          : item
      )
    )

    setEditingCommissionId(null)
    setCommissionValue('')
    setSavingCommission(false)

    setMessage(
      `Commission updated for ${product.name}.`
    )
  }

  async function updateApproval(product, status) {
    if (status === 'rejected') {
      const confirmed = window.confirm(`Reject "${product.name}"?`)
      if (!confirmed) return

      setUpdatingId(product.id)
      setError('')
      setMessage('')

      const updateData = {
        approval_status: 'rejected',
        status: 'inactive',
      }

      const { error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id)

      if (updateError) {
        console.log('APPROVAL UPDATE ERROR:', updateError)
        setError('Unable to update product approval.')
        setUpdatingId(null)
        return
      }

      setProducts((currentProducts) =>
        currentProducts.map((item) =>
          item.id === product.id ? { ...item, ...updateData } : item
        )
      )
      setUpdatingId(null)
      setMessage(`${product.name} rejected.`)
      return
    }

    if (status === 'active') {
      const farmerPrice = Number(product.price) || 0
      const commission = Number(product.commission_amount) || 0
      const customerPrice = farmerPrice + commission

      // 1. Auto-detect highest market rate in Tamil Nadu
      const detectedRate = detectTNMarketRate(product.name, product.unit, customerPrice)

      // CASE 1: Auto-detection successful
      if (detectedRate && detectedRate > customerPrice) {
        const savings = detectedRate - customerPrice
        const discountPercent = Math.round((savings / detectedRate) * 100)

        const confirmed = window.confirm(
          `Approve "${product.name}"?\n\n` +
          `• Farmer Price: ₹${farmerPrice.toFixed(2)} / ${product.unit}\n` +
          `• Commission: ₹${commission.toFixed(2)} / ${product.unit}\n` +
          `• Customer Selling Price: ₹${customerPrice.toFixed(2)} / ${product.unit}\n\n` +
          `✓ TN Highest Market Rate Auto-Detected: ₹${detectedRate.toFixed(2)} / ${product.unit}\n` +
          `Strikethrough Display: ~~₹${detectedRate.toFixed(2)}~~ ➔ ₹${customerPrice.toFixed(2)} (${discountPercent}% OFF · Customer saves ₹${savings.toFixed(2)})`
        )

        if (!confirmed) return

        await executeProductApproval(product, commission, detectedRate)
        return
      }

      // CASE 2: Auto-detection failed (Rare case) -> DO NOT APPROVE AUTOMATICALLY!
      // Open modal popup for admin to manually input the verified TN highest market rate
      setManualRateModal({
        product,
        commission,
        farmerPrice,
        customerPrice,
        manualRate: '',
        error: '',
      })
    }
  }

  async function executeProductApproval(product, commission, marketRate) {
    setUpdatingId(product.id)
    setError('')
    setMessage('Approving product with TN market rate...')

    let updatePayload = {
      commission_amount: commission,
      market_price: Number(marketRate),
      approval_status: 'active',
      status: 'active',
    }

    let { error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', product.id)

    // Fallback if market_price column is not yet in Supabase schema
    if (updateError && updateError.message && updateError.message.includes('market_price')) {
      updatePayload = {
        commission_amount: commission,
        approval_status: 'active',
        status: 'active',
      }
      const fallbackRes = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', product.id)
      updateError = fallbackRes.error
    }

    if (updateError) {
      console.log('APPROVAL UPDATE ERROR:', updateError)
      setError('Unable to approve product.')
      setUpdatingId(null)
      return
    }

    // Save to local registry so customer storefront immediately uses this approved rate
    saveApprovedMarketPrice(product.id, Number(marketRate))

    setProducts((currentProducts) =>
      currentProducts.map((item) =>
        item.id === product.id
          ? {
              ...item,
              commission_amount: commission,
              market_price: Number(marketRate),
              approval_status: 'active',
              status: 'active',
            }
          : item
      )
    )

    setManualRateModal(null)
    setUpdatingId(null)
    setMessage(
      `✓ "${product.name}" approved successfully with TN Highest Market Rate ₹${Number(marketRate).toFixed(2)}!`
    )
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setDeletingId(product.id)
    setError('')
    setMessage('')

    // Check whether this product has been ordered
    const {
      data: orderItems,
      error: orderCheckError,
    } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', product.id)
      .limit(1)

    if (orderCheckError) {
      console.log(
        'ORDER CHECK ERROR:',
        orderCheckError
      )

      setError(
        'Unable to check product orders.'
      )

      setDeletingId(null)
      return
    }

    if (
      orderItems &&
      orderItems.length > 0
    ) {
      alert('This product cannot be deleted because it has existing orders. You can make it inactive instead.');
      setError('This product cannot be deleted because it has existing orders. You can make it inactive instead.')

      setDeletingId(null)
      return
    }

    const { error: deleteError } =
      await supabase
        .from('products')
        .delete()
        .eq('id', product.id)

    if (deleteError) {
      console.log(
        'DELETE ERROR:',
        deleteError
      )

      alert('Unable to delete product: ' + deleteError.message);
      setError('Unable to delete product.')

      setDeletingId(null)
      return
    }

    setProducts((currentProducts) =>
      currentProducts.filter(
        (item) => item.id !== product.id
      )
    )

    setDeletingId(null)

    setMessage(
      `${product.name} deleted successfully.`
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen flex justify-center items-center bg-[#f7f8f5] font-sans">
        <div className="bg-white px-[40px] md:px-[60px] py-[30px] md:py-[40px] rounded-[14px] border border-gray-200 text-center text-gray-700 mx-4 max-w-sm w-full">
          <div className="text-[42px] mb-[10px]">
            🌾
          </div>

          <p>Loading products...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] font-sans">
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-200 py-[18px] px-[4%] md:px-[6%] flex justify-between items-center gap-[15px] flex-wrap">
        <div className="text-[22px] font-bold text-green-800">
          🌾 Uzhavar Market
        </div>

        <div className="flex items-center gap-[10px] flex-wrap">
          <button
            onClick={() =>
              loadProducts(true)
            }
            disabled={refreshing}
            className="py-[9px] px-[16px] border border-gray-300 rounded-[8px] bg-white text-gray-700 cursor-pointer font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {refreshing
              ? 'Refreshing...'
              : '↻ Refresh'}
          </button>

          <button
            onClick={() =>
              router.push('/admin/categories')
            }
            className="py-[9px] px-[16px] border border-green-700 rounded-[8px] bg-green-50 text-green-800 cursor-pointer font-semibold hover:bg-green-100 transition-colors flex items-center gap-1.5"
          >
            🏷️ Manage Categories
          </button>

          <button
            onClick={() =>
              router.push('/admin')
            }
            className="py-[9px] px-[18px] border border-gray-300 rounded-[8px] bg-white text-gray-700 cursor-pointer font-semibold hover:bg-gray-50 transition-colors"
          >
            ← Admin Dashboard
          </button>
        </div>
      </nav>

      <section className="w-[95%] sm:w-[90%] max-w-[1300px] mx-auto py-[30px] md:py-[40px]">
        {/* HEADER */}
        <div className="mb-[25px]">
          <div>
            <h1 className="m-0 mb-[8px] text-[28px] md:text-[32px] font-bold text-gray-800">
              Product Management
            </h1>

            <p className="m-0 text-gray-500 text-sm md:text-base">
              Manage farmer products, pricing,
              commission and approvals.
            </p>
          </div>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 py-[13px] px-[16px] rounded-[10px] mb-[18px]">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 py-[13px] px-[16px] rounded-[10px] mb-[18px]">
            ⚠️ {error}
          </div>
        )}

        {/* SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px] md:gap-[15px] mb-[25px]">
          <div className="bg-white border border-gray-200 rounded-[12px] p-[12px] md:p-[18px] flex items-center gap-[10px] md:gap-[14px]">
            <div className="w-[35px] h-[35px] md:w-[45px] md:h-[45px] rounded-[10px] bg-green-50 flex justify-center items-center text-[18px] md:text-[22px] shrink-0">
              📦
            </div>

            <div>
              <div className="text-[18px] md:text-[23px] font-bold text-gray-800">
                {stats.total}
              </div>

              <div className="text-[11px] md:text-[13px] text-gray-500 mt-[2px] md:mt-[3px]">
                Total Products
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[12px] p-[12px] md:p-[18px] flex items-center gap-[10px] md:gap-[14px]">
            <div className="w-[35px] h-[35px] md:w-[45px] md:h-[45px] rounded-[10px] bg-green-50 flex justify-center items-center text-[18px] md:text-[22px] shrink-0">
              🟢
            </div>

            <div>
              <div className="text-[18px] md:text-[23px] font-bold text-gray-800">
                {stats.active}
              </div>

              <div className="text-[11px] md:text-[13px] text-gray-500 mt-[2px] md:mt-[3px]">
                Active
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[12px] p-[12px] md:p-[18px] flex items-center gap-[10px] md:gap-[14px]">
            <div className="w-[35px] h-[35px] md:w-[45px] md:h-[45px] rounded-[10px] bg-green-50 flex justify-center items-center text-[18px] md:text-[22px] shrink-0">
              ⏳
            </div>

            <div>
              <div className="text-[18px] md:text-[23px] font-bold text-gray-800">
                {stats.pending}
              </div>

              <div className="text-[11px] md:text-[13px] text-gray-500 mt-[2px] md:mt-[3px]">
                Pending Approval
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-[12px] p-[12px] md:p-[18px] flex items-center gap-[10px] md:gap-[14px]">
            <div className="w-[35px] h-[35px] md:w-[45px] md:h-[45px] rounded-[10px] bg-green-50 flex justify-center items-center text-[18px] md:text-[22px] shrink-0">
              🔴
            </div>

            <div>
              <div className="text-[18px] md:text-[23px] font-bold text-gray-800">
                {stats.rejected}
              </div>

              <div className="text-[11px] md:text-[13px] text-gray-500 mt-[2px] md:mt-[3px]">
                Rejected
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH + FILTER */}
        <div className="bg-white border border-gray-200 rounded-[12px] p-[15px] md:p-[18px] mb-[15px]">
          <div className="flex items-center gap-[8px] border border-gray-300 rounded-[9px] px-[12px] mb-[15px] focus-within:ring-2 focus-within:ring-green-500">
            <span>🔍</span>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search product or farmer..."
              className="w-full border-none outline-none py-[11px] text-[15px] bg-transparent"
            />
          </div>

          <div className="flex gap-[6px] md:gap-[8px] flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`py-[6px] md:py-[8px] px-[10px] md:px-[13px] rounded-[20px] font-semibold text-[12px] md:text-[13px] transition-colors ${
                filter === 'all'
                  ? 'border border-green-800 bg-green-800 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All ({stats.total})
            </button>

            <button
              onClick={() => setFilter('active')}
              className={`py-[6px] md:py-[8px] px-[10px] md:px-[13px] rounded-[20px] font-semibold text-[12px] md:text-[13px] transition-colors ${
                filter === 'active'
                  ? 'border border-green-800 bg-green-800 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Active ({stats.active})
            </button>

            <button
              onClick={() => setFilter('pending')}
              className={`py-[6px] md:py-[8px] px-[10px] md:px-[13px] rounded-[20px] font-semibold text-[12px] md:text-[13px] transition-colors ${
                filter === 'pending'
                  ? 'border border-green-800 bg-green-800 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Pending ({stats.pending})
            </button>

            <button
              onClick={() => setFilter('approved')}
              className={`py-[6px] md:py-[8px] px-[10px] md:px-[13px] rounded-[20px] font-semibold text-[12px] md:text-[13px] transition-colors ${
                filter === 'approved'
                  ? 'border border-green-800 bg-green-800 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Approved
            </button>

            <button
              onClick={() => setFilter('rejected')}
              className={`py-[6px] md:py-[8px] px-[10px] md:px-[13px] rounded-[20px] font-semibold text-[12px] md:text-[13px] transition-colors ${
                filter === 'rejected'
                  ? 'border border-green-800 bg-green-800 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Rejected
            </button>

            <button
              onClick={() => setFilter('inactive')}
              className={`py-[6px] md:py-[8px] px-[10px] md:px-[13px] rounded-[20px] font-semibold text-[12px] md:text-[13px] transition-colors ${
                filter === 'inactive'
                  ? 'border border-green-800 bg-green-800 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* RESULT */}
        <div className="mb-[15px] text-gray-500 text-[14px]">
          Showing {filteredProducts.length} of{' '}
          {products.length} products
        </div>

        {/* PRODUCTS */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-[14px] py-[60px] px-[20px] md:px-[30px] text-center text-gray-500">
            <div className="text-[40px] md:text-[50px] mb-[10px]">
              📦
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">No products found</h2>

            <p>
              Try changing your search or filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[20px] md:gap-[25px]">
            {filteredProducts.map((product) => {
              const farmer = getFarmer(product)

              const farmerPrice = Number(
                product.price || 0
              )

              const commission = Number(
                product.commission_amount || 0
              )

              const customerPrice =
                getCustomerPrice(product)

              const stock = Number(
                product.stock_quantity || 0
              )

              const isEditingCommission =
                editingCommissionId ===
                product.id

              return (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-[14px] overflow-hidden flex flex-col h-full shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* IMAGE */}
                  {product.image_url ? (
                    <div className="relative">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-[180px] md:h-[220px] object-cover block"
                      />

                      <div
                        className={
                          getApprovalStyle(
                            product.approval_status
                          )
                        }
                      >
                        {getApprovalLabel(
                          product.approval_status
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[180px] md:h-[220px] bg-green-50 flex justify-center items-center text-[55px] relative">
                      <span>🌱</span>

                      <div
                        className={
                          getApprovalStyle(
                            product.approval_status
                          )
                        }
                      >
                        {getApprovalLabel(
                          product.approval_status
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-[15px] md:p-[20px] flex-grow flex flex-col">
                    {/* PRODUCT NAME */}
                    <h2
                      className="m-0 mb-[8px] text-[18px] md:text-[21px] font-bold text-gray-800"
                    >
                      {product.name}
                    </h2>

                    <p
                      className="m-0 mb-[15px] text-gray-500 text-[13px] md:text-[14px] leading-relaxed min-h-[40px] line-clamp-2"
                    >
                      {cleanProductDescription(product.description) ||
                        'No description'}
                    </p>

                    {/* FARMER */}
                    <div className="bg-gray-50 border border-gray-200 rounded-[9px] p-[10px] md:p-[12px] flex flex-col gap-[4px] text-[12px] md:text-[13px] text-gray-700 mb-[14px]">
                      <div className="text-green-800 font-bold mb-[2px] md:mb-[3px]">
                        👨‍🌾 Farmer
                      </div>

                      <strong>
                        {farmer?.full_name ||
                          'Unknown Farmer'}
                      </strong>

                      {farmer?.farm_name && (
                        <span>
                          {farmer.farm_name}
                        </span>
                      )}

                      {farmer?.phone && (
                        <span>
                          📞 {farmer.phone}
                        </span>
                      )}
                    </div>

                    {/* PRICING */}
                    <div className="bg-gray-50 rounded-[10px] p-[10px] md:p-[13px] mt-auto">
                      <div className="flex justify-between gap-[10px] text-[12px] md:text-[13px] text-gray-500 mb-[10px]">
                        <span>
                          Farmer Price
                        </span>

                        <strong>
                          ₹
                          {farmerPrice.toLocaleString(
                            'en-IN'
                          )}
                          {product.unit
                            ? ` / ${product.unit_count || 1} ${product.unit}`
                            : ''}
                        </strong>
                      </div>

                      {/* COMMISSION */}
                      <div className="text-[12px] md:text-[13px] text-gray-500 flex justify-between items-center gap-2">
                        <span>
                          Commission
                        </span>

                        {isEditingCommission ? (
                          <div className="flex items-center gap-[4px] md:gap-[6px] flex-wrap justify-end">
                            <div className="flex items-center border border-gray-300 rounded-[6px] bg-white pl-[5px] md:pl-[7px] w-auto max-w-[100px]">
                              <span>
                                ₹
                              </span>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  commissionValue
                                }
                                onChange={(e) =>
                                  setCommissionValue(
                                    e.target.value
                                  )
                                }
                                className="w-[50px] md:w-[70px] border-none outline-none py-[5px] md:py-[7px] px-[4px] md:px-[5px] text-[12px] md:text-[13px] bg-transparent"
                                autoFocus
                              />
                            </div>

                            <div className="flex gap-1 mt-1 sm:mt-0">
                              <button
                                onClick={() =>
                                  saveCommission(
                                    product
                                  )
                                }
                                disabled={
                                  savingCommission
                                }
                                className="border-none bg-green-800 text-white py-[5px] md:py-[7px] px-[7px] md:px-[9px] rounded-[6px] cursor-pointer text-[10px] md:text-[11px] font-semibold hover:bg-green-900 disabled:opacity-50"
                              >
                                {savingCommission
                                  ? '...'
                                  : 'Save'}
                              </button>

                              <button
                                onClick={
                                  cancelCommissionEdit
                                }
                                disabled={
                                  savingCommission
                                }
                                className="border border-gray-300 bg-white text-gray-700 py-[4px] md:py-[6px] px-[6px] md:px-[8px] rounded-[6px] cursor-pointer text-[10px] md:text-[11px] hover:bg-gray-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-[6px] md:gap-[8px]">
                            <strong>
                              ₹
                              {commission.toLocaleString(
                                'en-IN'
                              )}
                            </strong>

                            <button
                              onClick={() =>
                                startCommissionEdit(
                                  product
                                )
                              }
                              className="border-none bg-blue-50 text-blue-700 py-[4px] md:py-[5px] px-[6px] md:px-[8px] rounded-[6px] cursor-pointer text-[10px] md:text-[11px] font-semibold hover:bg-blue-100"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-[12px] md:text-[13px] text-gray-500 flex justify-between items-center mt-2">
                        <span>Delivery</span>
                        <strong>
                          ₹{Number(product.delivery_price || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>

                      <div className="border-t border-gray-200 my-[8px] md:my-[10px]" />

                      {/* CUSTOMER PRICE */}
                      <div className="flex justify-between gap-[10px] text-green-800 text-[14px] md:text-[15px] font-bold">
                        <span>
                          Customer Price
                        </span>

                        <strong>
                          ₹
                          {customerPrice.toLocaleString(
                            'en-IN'
                          )}
                          {product.unit
                            ? ` / ${product.unit_count || 1} ${product.unit}`
                            : ''}
                        </strong>
                      </div>
                    </div>

                    {/* STOCK */}
                    <div className="mt-[12px] p-[10px] md:p-[11px] border border-gray-200 rounded-[9px] flex items-center gap-[6px] md:gap-[8px] text-[12px] md:text-[13px]">
                      <span>Stock</span>

                      <strong>
                        {stock}{' '}
                        {product.unit || ''}
                      </strong>

                      <span
                        className={`ml-auto py-[4px] md:py-[5px] px-[6px] md:px-[8px] rounded-[15px] text-[9px] md:text-[10px] font-bold ${
                          stock > 0
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {stock > 0
                          ? 'In Stock'
                          : 'Out of Stock'}
                      </span>
                    </div>

                    {/* STATUS */}
                    <div className="mt-[12px] p-[10px] md:p-[12px] border border-gray-200 rounded-[9px] grid grid-cols-2 gap-[10px] md:gap-[12px] text-[12px] md:text-[13px]">
                      <div>
                        <span className="block text-gray-500 text-[10px] md:text-[11px] mb-[2px] md:mb-[4px]">
                          Product Status
                        </span>

                        <strong>
                          {product.status ===
                          'active'
                            ? '🟢 Active'
                            : '🔴 Inactive'}
                        </strong>
                      </div>

                      <div>
                        <span className="block text-gray-500 text-[10px] md:text-[11px] mb-[2px] md:mb-[4px]">
                          Approval
                        </span>

                        <strong>
                          {getApprovalLabel(
                            product.approval_status
                          )}
                        </strong>
                      </div>
                    </div>

                    {/* APPROVAL BUTTONS */}
                    {product.approval_status ===
                      'pending' && (
                      <div className="grid grid-cols-2 gap-[6px] md:gap-[8px] mt-[12px] md:mt-[15px]">
                        <button
                          onClick={() =>
                            updateApproval(
                              product,
                              'active'
                            )
                          }
                          disabled={
                            updatingId ===
                            product.id
                          }
                          className="p-[8px] md:p-[10px] border-none rounded-[8px] bg-green-800 text-white cursor-pointer font-semibold text-xs md:text-sm hover:bg-green-900 disabled:opacity-50 transition-colors"
                        >
                          {updatingId ===
                          product.id
                            ? 'Updating...'
                            : '✓ Approve'}
                        </button>

                        <button
                          onClick={() =>
                            updateApproval(
                              product,
                              'rejected'
                            )
                          }
                          disabled={
                            updatingId ===
                            product.id
                          }
                          className="p-[8px] md:p-[10px] border-none rounded-[8px] bg-red-600 text-white cursor-pointer font-semibold text-xs md:text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}

                    {/* REACTIVATE APPROVED PRODUCT */}
                    {product.approval_status ===
                      'active' &&
                      product.status !==
                        'active' && (
                        <button
                          onClick={() =>
                            updateApproval(
                              product,
                              'active'
                            )
                          }
                          disabled={
                            updatingId ===
                            product.id
                          }
                          className="w-full mt-[12px] md:mt-[15px] p-[8px] md:p-[10px] border-none rounded-[8px] bg-green-800 text-white cursor-pointer font-semibold text-xs md:text-sm hover:bg-green-900 disabled:opacity-50 transition-colors"
                        >
                          🟢 Activate Product
                        </button>
                      )}

                    {/* DELETE */}
                    <button
                      onClick={() =>
                        deleteProduct(product)
                      }
                      disabled={
                        deletingId === product.id
                      }
                      className="w-full mt-[8px] md:mt-[10px] p-[7px] md:p-[9px] border border-red-200 rounded-[8px] bg-red-50 text-red-700 cursor-pointer font-semibold text-xs md:text-sm hover:bg-red-100 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === product.id
                        ? 'Deleting...'
                        : '🗑️ Delete Product'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* =====================================================
          MANUAL TN HIGHEST MARKET RATE MODAL (RARE CASE)
      ===================================================== */}
      {manualRateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>
                  TN Highest Market Rate Required
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                  Auto-detection could not find a verified Tamil Nadu market rate for this product.
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#92400e',
                fontSize: '13px',
                lineHeight: 1.5,
                marginBottom: '14px',
              }}
            >
              In order to show the <strong>strikethrough rate (~~MRP~~)</strong> and <strong>discount offer (% OFF)</strong> to customers, this product <strong>cannot be approved</strong> without entering the highest retail rate in Tamil Nadu.
            </div>

            {/* Product Summary */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Product:</span>
                <strong style={{ color: '#0f172a' }}>{manualRateModal.product.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Farmer Price:</span>
                <span>₹{manualRateModal.farmerPrice.toFixed(2)} / {manualRateModal.product.unit}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Admin Commission:</span>
                <span style={{ color: '#15803d', fontWeight: 600 }}>+₹{manualRateModal.commission.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                <strong style={{ color: '#0f172a' }}>Customer Selling Price:</strong>
                <strong style={{ color: '#166534', fontSize: '15px' }}>
                  ₹{manualRateModal.customerPrice.toFixed(2)} / {manualRateModal.product.unit}
                </strong>
              </div>
            </div>

            {/* Manual Rate Input */}
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '6px' }}>
              Enter TN Highest Retail Market Rate (₹) *
              <span style={{ fontWeight: 'normal', color: '#64748b', fontSize: '11px' }}> (per {manualRateModal.product.unit})</span>
            </label>
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: '#64748b' }}>₹</span>
              <input
                type="number"
                min={manualRateModal.customerPrice + 1}
                step="1"
                placeholder={`E.g. ${(manualRateModal.customerPrice * 1.3).toFixed(0)}`}
                value={manualRateModal.manualRate}
                onChange={(e) => {
                  const val = e.target.value
                  setManualRateModal((prev) => ({
                    ...prev,
                    manualRate: val,
                    error: '',
                  }))
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 28px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Live Auto-Calculated Offer Preview */}
            {Number(manualRateModal.manualRate) > manualRateModal.customerPrice && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>
                  ✓ Customer Strikethrough & Offer Preview:
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '18px', color: '#0f172a' }}>
                    ₹{manualRateModal.customerPrice.toFixed(2)}
                  </strong>
                  <span style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'line-through' }}>
                    ₹{Number(manualRateModal.manualRate).toFixed(2)}
                  </span>
                  <span style={{ background: '#166534', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                    {Math.round(((Number(manualRateModal.manualRate) - manualRateModal.customerPrice) / Number(manualRateModal.manualRate)) * 100)}% OFF
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#15803d', marginTop: '4px', fontWeight: 600 }}>
                  Direct Savings: ₹{(Number(manualRateModal.manualRate) - manualRateModal.customerPrice).toFixed(2)} / {manualRateModal.product.unit}
                </div>
              </div>
            )}

            {manualRateModal.manualRate && Number(manualRateModal.manualRate) <= manualRateModal.customerPrice && (
              <p style={{ fontSize: '12px', color: '#dc2626', margin: '0 0 12px', fontWeight: 600 }}>
                ⚠️ Rate must be higher than the customer selling price (₹{manualRateModal.customerPrice.toFixed(2)}) to show an offer discount.
              </p>
            )}

            {manualRateModal.error && (
              <p style={{ fontSize: '12px', color: '#dc2626', margin: '0 0 12px' }}>{manualRateModal.error}</p>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => setManualRateModal(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel (Do not approve)
              </button>
              <button
                onClick={() => {
                  const entered = Number(manualRateModal.manualRate)
                  if (!entered || !Number.isFinite(entered) || entered <= manualRateModal.customerPrice) {
                    setManualRateModal((prev) => ({
                      ...prev,
                      error: `Please enter a valid rate greater than ₹${manualRateModal.customerPrice.toFixed(2)}.`,
                    }))
                    return
                  }
                  executeProductApproval(manualRateModal.product, manualRateModal.commission, entered)
                }}
                disabled={!manualRateModal.manualRate || Number(manualRateModal.manualRate) <= manualRateModal.customerPrice}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#166534',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: !manualRateModal.manualRate || Number(manualRateModal.manualRate) <= manualRateModal.customerPrice ? 'not-allowed' : 'pointer',
                  opacity: !manualRateModal.manualRate || Number(manualRateModal.manualRate) <= manualRateModal.customerPrice ? 0.6 : 1,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                ✓ Confirm & Approve Product
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}