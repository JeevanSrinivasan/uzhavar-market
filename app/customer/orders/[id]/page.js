"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

export default function CustomerOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { t, tu, ts, locale } = useLanguage();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params?.id)
        .eq("customer_id", user.id)
        .single();

      if (orderError) {
        console.error("Order fetch error:", orderError);
        setOrder(null);
        return;
      }
      setOrder(orderData);

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", params?.id)
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error("Order items fetch error:", itemsError);
        setItems([]);
        return;
      }
      setItems(itemsData || []);
    } catch (error) {
      console.error("Load order details error:", error);
    } finally {
      setLoading(false);
    }
  }, [params?.id, router]);

  useEffect(() => {
    if (params?.id) {
      loadOrder();
    }
  }, [params?.id, loadOrder]);

  async function handleCancelOrder() {
    if (!order?.id) return;
    const currentStatus = String(order.order_status || "").trim().toLowerCase();
    if (currentStatus !== "pending" && currentStatus !== "confirmed") {
      setActionError(t("orders.cannotCancelShippedNotice"));
      setShowCancelModal(false);
      return;
    }

    setCancelling(true);
    setActionError("");
    setActionMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update({ order_status: "cancelled" })
        .eq("id", order.id)
        .eq("customer_id", user.id)
        .in("order_status", ["pending", "confirmed"])
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("CANCEL ERROR:", error);
        setActionError(error.message || t("orders.cancelFailed"));
        return;
      }

      if (!updatedOrder) {
        setActionError(t("orders.cannotCancelShippedNotice"));
        return;
      }

      // Restore stock for cancelled order items
      try {
        const itemsToRestore = (items && items.length > 0) ? items : (await supabase
          .from("order_items")
          .select("product_id, quantity")
          .eq("order_id", order.id)).data || [];

        for (const itm of itemsToRestore) {
          if (!itm.product_id) continue;
          const { data: prod } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", itm.product_id)
            .single();

          if (prod && prod.stock_quantity !== null && prod.stock_quantity !== undefined) {
            const restoredStock = Number(prod.stock_quantity) + Number(itm.quantity || 1);
            await supabase
              .from("products")
              .update({ stock_quantity: restoredStock })
              .eq("id", itm.product_id);
          }
        }
      } catch (stockErr) {
        console.error("Failed to restore stock on cancel:", stockErr);
      }

      setOrder(updatedOrder);
      setActionMessage(
        t("orders.cancelSuccessNotice", {
          amount: `₹${Number(order.total_amount || 0).toFixed(2)}`,
        })
      );
      setShowCancelModal(false);
    } catch (err) {
      console.error("CANCEL ORDER ERROR:", err);
      setActionError(t("orders.cancelFailed"));
    } finally {
      setCancelling(false);
    }
  }

  function formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(date) {
    if (!date) return "-";
    return new Date(date).toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusClasses(status) {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function getPaymentClasses(status) {
    if (status === "paid") return "bg-green-100 text-green-800";
    return "bg-yellow-100 text-yellow-800";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold">{t("orders.loadingOrders")}</h2>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm mt-10">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold mb-2">{t("orders.orderNotFoundTitle")}</h2>
            <p className="text-gray-500 mb-6">{t("orders.orderNotFoundDesc")}</p>
            <button
              onClick={() => router.push("/customer/orders")}
              className="bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-800 cursor-pointer"
            >
              ← {t("orders.backToMyOrders")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const orderStatus = order.order_status || "pending";
  const paymentStatus = order.payment_status || "pending";
  const statusClasses = getStatusClasses(orderStatus);
  const paymentClasses = getPaymentClasses(paymentStatus);
  const totalAmount = Number(order.total_amount || 0);
  const canCancelOrder = orderStatus === "pending" || orderStatus === "confirmed";

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {actionMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-semibold">
            {actionMessage}
          </div>
        )}
        {actionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-semibold">
            {actionError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <button
              onClick={() => router.push("/customer/orders")}
              className="text-green-700 font-semibold hover:underline mb-2 cursor-pointer bg-transparent border-none p-0"
            >
              ← {t("orders.title")}
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              {t("orders.orderDetailsTitle")}
            </h1>
            <p className="text-sm text-gray-500 break-all">
              {t("orders.orderId")}: {order.id}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${statusClasses}`}>
              {ts(orderStatus)}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {t("orders.orderedOn", { date: formatDate(order.created_at) })}
            </p>
          </div>
        </div>

        {orderStatus === "cancelled" && (
          <section className="bg-red-50 border border-red-200 rounded-xl p-5 sm:p-6 mb-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                ✕
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-red-900 m-0 mb-1">
                  {t("orders.cancelledRefundTitle")}
                </h2>
                <p className="text-sm text-red-800 m-0 leading-relaxed">
                  {t("orders.cancelledRefundBody", {
                    amount: `₹${totalAmount.toFixed(2)}`,
                  })}
                </p>
                <p className="text-xs text-red-700 font-semibold mt-3 mb-0">
                  {t("orders.cancelledSupportNote", { email: "uzhavankural.3@gmail.com" })}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold mb-5 text-gray-900">{t("orders.orderStatus")}</h2>
          {orderStatus === "cancelled" ? (
            <div className="flex items-center w-full max-w-xs mx-auto justify-center py-2">
              <StatusStep title={t("orders.stepPlaced")} active={true} icon="✓" />
              <div className="h-0.5 bg-red-300 flex-1 min-w-[40px] mx-2 -mt-6"></div>
              <StatusStep title={t("orders.stepCancelled")} active={true} icon="✕" isCancelled={true} />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatusStep title={t("orders.stepPlaced")} active={true} icon="📝" />
              <StatusStep
                title={t("orders.stepConfirmed")}
                active={["confirmed", "shipped", "delivered"].includes(orderStatus)}
                icon="✓"
              />
              <StatusStep
                title={t("orders.stepShipped")}
                active={["shipped", "delivered"].includes(orderStatus)}
                icon="🚚"
              />
              <StatusStep title={t("orders.stepDelivered")} active={orderStatus === "delivered"} icon="📦" />
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold mb-5 text-gray-900">{t("orders.orderedProducts")}</h2>
          {items.length === 0 ? (
            <p className="text-gray-500">{t("orders.noOrderItems")}</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item) => {
                const price = Number(item.price || 0);
                const quantity = Number(item.quantity || 0);
                const itemTotal = Number(item.item_total) || price * quantity;
                return (
                  <div key={item.id} className="flex items-center gap-4 py-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-3xl shrink-0">
                      🌾
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">{item.product_name}</h3>
                      <p className="text-sm text-gray-500">
                        ₹{price.toFixed(2)} × {quantity} {tu(item.unit || "unit")}
                      </p>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      ₹{itemTotal.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <span className="font-medium text-gray-700">{t("orders.totalAmount")}</span>
            <strong className="text-2xl text-gray-900">₹{totalAmount.toFixed(2)}</strong>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold mb-5 text-gray-900">{t("checkout.deliveryDetails")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Detail label={t("orders.customer")} value={order.customer_name} />
            <Detail label={t("common.phone")} value={order.customer_phone} />
            <Detail label={t("orders.deliveryAddressTitle")} value={order.delivery_address} />
            <Detail label={t("common.village")} value={order.village} />
            <Detail label={t("common.district")} value={order.district} />
            <Detail label={t("orders.orderDate")} value={formatDateTime(order.created_at)} />
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4 text-gray-900">{t("orders.paymentInformation")}</h2>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">{t("orders.paymentStatusLabel")}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${paymentClasses}`}>
                {ts(paymentStatus)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">{t("orders.amountLabel")}</p>
              <strong className="text-xl text-gray-900">₹{totalAmount.toFixed(2)}</strong>
            </div>
          </div>
        </section>

        <div className="flex justify-center flex-wrap gap-3 mt-4">
          {canCancelOrder && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={cancelling}
              className="bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 px-5 py-2.5 rounded-lg font-semibold cursor-pointer transition-colors disabled:opacity-60"
            >
              ✕ {t("orders.cancelOrderBtn")}
            </button>
          )}
          <button
            onClick={() => router.push("/customer/products")}
            className="bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-green-800 cursor-pointer"
          >
            🛒 {t("orders.continueShopping")}
          </button>
          <button
            onClick={() => router.push("/customer/orders")}
            className="bg-white border border-gray-300 text-gray-800 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-50 cursor-pointer"
          >
            ← {t("nav.backToOrders")}
          </button>
        </div>

        {orderStatus === "shipped" && (
          <p className="text-center mt-3 text-xs text-gray-500 font-medium">
            🔒 {t("orders.cannotCancelShippedNotice")}
          </p>
        )}

        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-150">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xl font-bold mb-4">
                ✕
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {t("orders.cancelOrderModalTitle", { id: order.id.slice(0, 8) })}
              </h3>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {t("orders.cancelOrderModalPrompt")}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 text-xs text-amber-900 leading-relaxed">
                <strong>
                  ⚠️ {t("orders.cancelRefundNotice", {
                    amount: `₹${totalAmount.toFixed(2)}`,
                  })}
                </strong>
              </div>
              <p className="text-xs text-gray-500 mb-5 leading-normal">
                {t("orders.cancelOrderModalWarning")}
              </p>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {t("orders.keepOrderBtn")}
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm cursor-pointer transition-colors disabled:opacity-50"
                >
                  {cancelling ? t("orders.cancellingOrder") : t("orders.confirmCancelBtn")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatusStep({ title, active, icon, isCancelled }) {
  const bgClass = isCancelled
    ? "bg-red-600 text-white"
    : active
    ? "bg-green-700 text-white"
    : "bg-gray-200 text-gray-500";
  const textClass = isCancelled
    ? "font-bold text-red-700"
    : active
    ? "font-bold text-green-700"
    : "font-medium text-gray-500";

  return (
    <div className="text-center p-2">
      <div
        className={`w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${bgClass}`}
      >
        {icon}
      </div>
      <div className={`text-sm ${textClass}`}>
        {title}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="font-semibold text-gray-900 break-words">{value || "-"}</div>
    </div>
  );
}
