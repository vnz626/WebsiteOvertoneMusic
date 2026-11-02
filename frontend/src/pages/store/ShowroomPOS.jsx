import React, { useState, useEffect, useRef } from "react";
import {
  CreditCard,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Printer,
  Layers,
  RefreshCw,
  Store,
} from "lucide-react";
import api from "../../api";
import toast from "react-hot-toast";
import { formatRupiah } from "../../utils/format";
import { useAuth } from "../../auth/AuthContext";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";

export default function ShowroomPOS() {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(2); // Default: Senayan City
  const [catalogItems, setCatalogItems] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'bundles', 'cameras', 'lenses', 'lighting_audio'

  // Cart & Customer Form
  const [cart, setCart] = useState([]);
  const [isGuest, setIsGuest] = useState(true);
  const [customerName, setCustomerName] = useState("Walk-In Filmmaker");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("QRIS");
  const [cashTendered, setCashTendered] = useState("");

  // Processing & Receipt Modal
  const [processing, setProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const receiptPrintRef = useRef(null);

  // Load shift, branches, and catalog
  function loadData() {
    setLoading(true);
    // 1. Current shift
    api
      .get("/store/shift/current")
      .then((res) => {
        if (res.data?.data) {
          setActiveShift(res.data.data);
          if (res.data.data.branch_id) {
            setSelectedBranchId(res.data.data.branch_id);
          }
        }
      })
      .catch(() => {});

    // 2. Branches
    api
      .get("/products/venues")
      .then((res) => {
        const brs = (res.data?.data || res.data?.venues || []).filter(
          (b) => b.branch_type !== "warehouse"
        );
        setBranches(brs);
      })
      .catch(() => {});

    // 3. Multi-branch stocks
    api
      .get("/store/branch-stocks")
      .then((res) => {
        setCatalogItems(res.data?.data || []);
      })
      .catch(() => {});

    // 4. Bundles
    api
      .get("/store/bundles")
      .then((res) => {
        setBundles(res.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || {
    id: selectedBranchId,
    name: "Showroom Senayan City",
    city: "Jakarta Pusat",
  };

  // Filter products by search and category
  const filteredProducts = catalogItems.filter((item) => {
    const matchSearch =
      !search ||
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku_code.toLowerCase().includes(search.toLowerCase()) ||
      item.brand_name.toLowerCase().includes(search.toLowerCase()) ||
      item.variant_name.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (activeTab === "all") return true;
    if (activeTab === "bundles") return false;
    if (activeTab === "cameras") return item.category?.toLowerCase().includes("camera");
    if (activeTab === "lenses") return item.category?.toLowerCase().includes("lens");
    if (activeTab === "lighting_audio") return item.category?.toLowerCase().includes("light") || item.category?.toLowerCase().includes("audio");
    return true;
  });

  const filteredBundles = bundles.filter((b) => {
    if (activeTab !== "all" && activeTab !== "bundles") return false;
    return (
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.bundle_code.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Helper get branch stock for a variant
  function getBranchStock(item) {
    const s = (item.branch_stocks || []).find((b) => b.branch_id === selectedBranchId);
    return s ? s.stock : 0;
  }

  // Cart operations
  function addToCart(item, isBundle = false) {
    if (isBundle) {
      const existing = cart.find((c) => c.bundle_id === item.id);
      if (existing) {
        setCart(
          cart.map((c) =>
            c.bundle_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
          )
        );
      } else {
        setCart([
          ...cart,
          {
            bundle_id: item.id,
            variant_id: null,
            name: item.name,
            code: item.bundle_code,
            price: item.bundle_price,
            quantity: 1,
            isBundle: true,
            bundle_items: item.items || [],
          },
        ]);
      }
    } else {
      const branchStock = getBranchStock(item);
      const existing = cart.find((c) => c.variant_id === item.variant_id);
      const currentQtyInCart = existing ? existing.quantity : 0;

      if (currentQtyInCart >= branchStock) {
        toast.error(
          `Stok tidak mencukupi di cabang ini! Tersedia hanya ${branchStock} unit untuk SKU ${item.sku_code}.`
        );
        return;
      }

      if (existing) {
        setCart(
          cart.map((c) =>
            c.variant_id === item.variant_id
              ? { ...c, quantity: c.quantity + 1 }
              : c
          )
        );
      } else {
        setCart([
          ...cart,
          {
            variant_id: item.variant_id,
            bundle_id: null,
            name: `${item.product_name} - ${item.color_finish || item.variant_name}`,
            code: item.sku_code,
            price: item.price,
            quantity: 1,
            isBundle: false,
          },
        ]);
      }
    }
  }

  function updateQuantity(idx, change) {
    const item = cart[idx];
    const newQty = item.quantity + change;
    if (newQty <= 0) {
      removeFromCart(idx);
      return;
    }

    if (!item.isBundle) {
      const catItem = catalogItems.find((c) => c.variant_id === item.variant_id);
      if (catItem) {
        const branchStock = getBranchStock(catItem);
        if (newQty > branchStock) {
          toast.error(`Maksimal stok cabang hanya ${branchStock} unit`);
          return;
        }
      }
    }

    setCart(
      cart.map((c, i) => (i === idx ? { ...c, quantity: newQty } : c))
    );
  }

  function removeFromCart(idx) {
    setCart(cart.filter((_, i) => i !== idx));
  }

  function clearCart() {
    setCart([]);
  }

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalAmount = subtotal; // PPN inclusive
  const parsedCash = parseFloat(cashTendered) || 0;
  const changeAmount = paymentMethod === "Cash" ? Math.max(0, parsedCash - totalAmount) : 0;
  const isCashInsufficient = paymentMethod === "Cash" && parsedCash < totalAmount;

  // Checkout submission
  function handleProcessCheckout(e) {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Keranjang kasir masih kosong!");
      return;
    }
    if (paymentMethod === "Cash" && isCashInsufficient) {
      toast.error("Nominal uang tunai yang diterima kurang dari total belanja!");
      return;
    }

    setProcessing(true);
    const payload = {
      branch_id: selectedBranchId,
      customer_name: isGuest ? "Walk-In Filmmaker Guest" : customerName || "Pelanggan Showroom",
      customer_email: isGuest ? "walkin@overtone.id" : customerEmail || "customer@overtone.id",
      customer_phone: customerPhone || "081200000000",
      payment_method: paymentMethod,
      cash_tendered: paymentMethod === "Cash" ? parsedCash : totalAmount,
      items: cart.map((c) => ({
        variant_id: c.variant_id,
        bundle_id: c.bundle_id,
        quantity: c.quantity,
        unit_price: c.price,
      })),
    };

    api
      .post("/store/pos/checkout", payload)
      .then((res) => {
        setReceiptData(res.data?.receipt);
        setReceiptModalOpen(true);
        setCart([]);
        setCashTendered("");
        toast.success("Transaksi kasir POS berhasil dicatat!");
        // Reload live branch stock
        loadData();
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Gagal memproses transaksi kasir POS");
      })
      .finally(() => setProcessing(false));
  }

  function handlePrintReceipt() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-canvas p-4 sm:p-6 lg:p-8 text-ink font-sans">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-ink text-canvas">
            <CreditCard size={18} aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink">
              In-Store POS — Offline Store
            </h1>
            <p className="text-xs text-ink-secondary">
              Sistem Kasir Transaksi Walk-In Terintegrasi Real-time ke Stok Cabang, P&amp;L Finance &amp; MIS
            </p>
          </div>
        </div>

        {/* Active Branch Selector / Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2.5 rounded-sm border border-line bg-surface px-3 py-2">
            <Store size={15} className="text-ink-muted" aria-hidden="true" />
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">OFFLINE STORE AKTIF</p>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(parseInt(e.target.value))}
                className="bg-transparent text-xs font-bold text-ink focus:outline-none cursor-pointer"
                aria-label="Pilih Offline Store Aktif"
              >
                {branches.length > 0 ? (
                  branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))
                ) : (
                  <>
                    <option value={2}>Showroom Senayan City</option>
                    <option value={3}>Showroom PIK Avenue</option>
                    <option value={4}>Showroom Bandung</option>
                    <option value={5}>Showroom Surabaya</option>
                    <option value={6}>Showroom Bali</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={loadData}
            title="Muat ulang stok"
            aria-label="Muat ulang stok"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Main Grid: Left (Catalog) vs Right (Cart & Checkout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Catalog & Bundles (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Pills */}
          <div className="rounded-md border border-line bg-surface p-4 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
              <input
                type="text"
                placeholder="Cari cinema camera, lens mount, kode SKU, brand Sony, RED, Canon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ot-input w-full pl-10 pr-4 py-2.5 text-xs"
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { id: "all", label: "Semua Produk" },
                { id: "bundles", label: "Indie Filmmaker Kits", icon: Layers, highlight: true },
                { id: "cameras", label: "Cinema Cameras" },
                { id: "lenses", label: "Cine Lenses" },
                { id: "lighting_audio", label: "Lighting & Audio" },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
                      active
                        ? "bg-ink text-canvas"
                        : tab.highlight
                        ? "bg-accent-soft text-accent border border-accent/20 hover:bg-accent/15"
                        : "bg-surface-muted text-ink-secondary hover:text-ink border border-line"
                    }`}
                  >
                    {Icon && <Icon size={13} aria-hidden="true" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Paket Bundle Highlight (If All or Bundles tab) */}
          {(activeTab === "all" || activeTab === "bundles") && filteredBundles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-accent" aria-hidden="true" />
                  <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ink">
                    Curated Indie Filmmaker Production Kits (Paket Rig)
                  </h2>
                </div>
                <Badge variant="amber">Potong Multi-Stok Sekaligus</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredBundles.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col justify-between rounded-md border border-line-strong bg-surface p-4 hover:border-ink transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="rounded-xs bg-surface-muted border border-line px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink tracking-wider tabular-nums">
                          {b.bundle_code}
                        </span>
                        <Badge variant="teal">Hemat {formatRupiah(b.savings_amount)}</Badge>
                      </div>
                      <h3 className="font-display text-sm font-bold text-ink line-clamp-1">{b.name}</h3>
                      <p className="text-xs text-ink-secondary mt-1 line-clamp-2 leading-relaxed">
                        {b.description}
                      </p>

                      {/* Items Preview */}
                      <div className="mt-2.5 rounded-sm bg-canvas p-2.5 text-[11px] text-ink-secondary space-y-1 border border-line">
                        <p className="font-semibold text-ink">Komponen Rig:</p>
                        {(b.items || []).map((it, idx) => (
                          <p key={idx} className="truncate tabular-nums">
                            &bull; {it.qty}x {it.product_name || it.variant_name}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-line">
                      <div className="tabular-nums">
                        <span className="text-[11px] text-ink-muted line-through">
                          {formatRupiah(b.normal_total_price)}
                        </span>
                        <p className="font-display text-sm font-bold text-ink">{formatRupiah(b.bundle_price)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => addToCart(b, true)}
                      >
                        <Plus size={14} aria-hidden="true" />
                        <span>Pilih Bundle</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Catalog Products Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xs font-bold uppercase tracking-wider text-ink tabular-nums">
                Katalog Instrumen Musik &amp; SKU ({filteredProducts.length} Varian)
              </h2>
              <span className="text-xs text-ink-secondary">
                Stok fisik showroom: <strong className="text-ink">{currentBranch.name}</strong>
              </span>
            </div>

            {loading ? (
              <div className="rounded-md border border-line bg-surface p-12 text-center text-xs text-ink-muted">
                Memuat data inventaris showroom...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-md border border-line bg-surface p-12 text-center text-xs text-ink-muted">
                Tidak ada instrumen yang cocok dengan pencarian.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredProducts.map((p) => {
                  const branchStock = getBranchStock(p);
                  const inStock = branchStock > 0;
                  return (
                    <div
                      key={p.variant_id}
                      className="flex flex-col justify-between rounded-md border border-line bg-surface p-3.5 hover:border-line-strong transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider truncate max-w-[120px]">
                            {p.brand_name}
                          </span>
                          <Badge variant={inStock ? "teal" : "rose"}>
                            {inStock ? `Tersedia ${branchStock} Unit` : "Habis di Cabang"}
                          </Badge>
                        </div>

                        <h4 className="font-display text-xs font-bold text-ink line-clamp-1">{p.product_name}</h4>
                        <p className="text-[11px] text-ink-secondary line-clamp-1 mt-0.5">
                          {p.color_finish || p.variant_name}
                        </p>
                        <p className="text-[10px] text-ink-muted font-mono mt-1 tabular-nums">{p.sku_code}</p>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-line">
                        <span className="font-display text-xs font-bold text-ink tabular-nums">{formatRupiah(p.price)}</span>
                        <Button
                          type="button"
                          variant={inStock ? "secondary" : "ghost"}
                          size="xs"
                          disabled={!inStock}
                          onClick={() => addToCart(p, false)}
                        >
                          <Plus size={13} aria-hidden="true" />
                          <span>{inStock ? "Tambah" : "Habis"}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Cashier Cart & Payment (5 cols) */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <form
            onSubmit={handleProcessCheckout}
            className="rounded-md border border-line bg-surface p-5 space-y-4"
          >
            {/* Cart Header */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart size={17} className="text-ink" aria-hidden="true" />
                <h3 className="font-display text-sm font-bold text-ink">Keranjang Kasir Showroom</h3>
                <span className="rounded-xs bg-ink px-2 py-0.5 text-[10px] font-bold text-canvas tabular-nums">
                  {cart.reduce((s, i) => s + i.quantity, 0)} Item
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-semibold text-status-danger hover:underline"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {/* Customer Identification */}
            <div className="rounded-sm bg-canvas p-3 space-y-2 border border-line text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Data Pembeli</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGuest}
                    onChange={(e) => setIsGuest(e.target.checked)}
                    className="rounded-xs border-line-strong text-ink focus:ring-accent"
                  />
                  <span className="text-xs text-ink-secondary font-medium">Walk-In Guest</span>
                </label>
              </div>

              {!isGuest && (
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
                      Nama Pembeli
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Filmmaker / Pembeli"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="ot-input w-full px-2.5 py-1.5 text-xs"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
                        No. WhatsApp
                      </label>
                      <input
                        type="tel"
                        placeholder="0812xxxx"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="ot-input w-full px-2.5 py-1.5 text-xs tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
                        Email Struk
                      </label>
                      <input
                        type="email"
                        placeholder="email@domain"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="ot-input w-full px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="rounded-sm border border-dashed border-line-strong p-8 text-center text-xs text-ink-muted">
                  Belum ada instrumen di keranjang. Klik <strong>+ Tambah</strong> dari katalog di sebelah kiri.
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-sm border border-line bg-canvas p-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        {item.isBundle && <Badge variant="amber">BUNDLE</Badge>}
                        <p className="font-bold text-ink truncate">{item.name}</p>
                      </div>
                      <p className="text-[11px] text-ink-secondary mt-0.5 tabular-nums">
                        {formatRupiah(item.price)} x {item.quantity} ={" "}
                        <strong className="text-ink">{formatRupiah(item.price * item.quantity)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, -1)}
                        aria-label="Kurangi jumlah"
                        className="flex h-6 w-6 items-center justify-center rounded-xs border border-line-strong bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink"
                      >
                        <Minus size={11} aria-hidden="true" />
                      </button>
                      <span className="w-5 text-center font-bold text-xs tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, 1)}
                        aria-label="Tambah jumlah"
                        className="flex h-6 w-6 items-center justify-center rounded-xs border border-line-strong bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink"
                      >
                        <Plus size={11} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(idx)}
                        aria-label="Hapus item"
                        className="ml-1 text-ink-muted hover:text-status-danger p-1"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-2 border-t border-line text-xs">
              <label className="block font-bold text-ink">Metode Pembayaran Showroom</label>
              <div className="grid grid-cols-2 gap-2">
                {["QRIS", "Debit/Credit EDC", "Bank Transfer", "Cash"].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-sm border p-2 text-xs font-semibold text-center transition-colors ${
                      paymentMethod === method
                        ? "border-ink bg-ink text-canvas"
                        : "border-line bg-surface text-ink-secondary hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Cash tendered input if Cash */}
              {paymentMethod === "Cash" && (
                <div className="rounded-sm border border-line bg-canvas p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-ink">Nominal Uang Tunai Diterima</label>
                    <button
                      type="button"
                      onClick={() => setCashTendered(totalAmount.toString())}
                      className="text-[11px] font-bold text-accent hover:underline"
                    >
                      Uang Pas
                    </button>
                  </div>
                  <input
                    type="number"
                    placeholder="Rp 0"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="ot-input w-full px-3 py-2 text-xs font-bold tabular-nums"
                    min={0}
                  />

                  {/* Quick Denominations */}
                  <div className="flex flex-wrap gap-1">
                    {[100000, 500000, 1000000, 10000000, 50000000].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCashTendered(d.toString())}
                        className="rounded-xs border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink tabular-nums"
                      >
                        {formatRupiah(d)}
                      </button>
                    ))}
                  </div>

                  {parsedCash > 0 && (
                    <div className="flex items-center justify-between pt-1 text-xs tabular-nums">
                      <span className="font-medium text-ink-secondary">Kembalian:</span>
                      <span
                        className={`font-bold ${
                          isCashInsufficient ? "text-status-danger" : "text-status-success text-sm"
                        }`}
                      >
                        {isCashInsufficient
                          ? `Kurang ${formatRupiah(totalAmount - parsedCash)}`
                          : formatRupiah(changeAmount)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Total Summary */}
            <div className="rounded-sm bg-canvas p-3 space-y-1 text-xs border border-line tabular-nums">
              <div className="flex justify-between text-ink-secondary">
                <span>Subtotal ({cart.length} Jenis)</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink-secondary">
                <span>PPN 11% (Termasuk)</span>
                <span>{formatRupiah(Math.round(subtotal * 0.11))}</span>
              </div>
              <div className="flex justify-between font-display text-base font-bold text-ink pt-1.5 border-t border-line">
                <span>Total Bayar</span>
                <span>{formatRupiah(totalAmount)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-3"
              disabled={cart.length === 0 || processing || (paymentMethod === "Cash" && isCashInsufficient)}
            >
              {processing ? (
                <>
                  <RefreshCw size={15} className="animate-spin" aria-hidden="true" />
                  <span>Memproses Transaksi...</span>
                </>
              ) : (
                <>
                  <Printer size={16} aria-hidden="true" />
                  <span>Proses Transaksi Kasir &amp; Cetak Struk</span>
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* MODAL STRUK RESMI KASIR POS (OFFICIAL POS RECEIPT MODAL) */}
      <Modal
        open={receiptModalOpen && !!receiptData}
        onClose={() => setReceiptModalOpen(false)}
        title="Struk Resmi Transaksi Kasir POS"
        maxWidth="max-w-md"
      >
        {receiptData && (
          <div className="space-y-4">
            {/* Printable Receipt Paper Container */}
            <div
              ref={receiptPrintRef}
              className="rounded-sm border border-dashed border-line-strong bg-surface p-5 text-ink font-mono text-[11px] leading-tight space-y-3 tabular-nums"
            >
              {/* Header */}
              <div className="text-center space-y-1 border-b border-dashed border-line-strong pb-3">
                <h2 className="font-display text-base font-bold tracking-widest text-ink">
                  OVERTONE PRO CINEMA
                </h2>
                <p className="text-[10px] text-ink-secondary">{receiptData.branch_name}</p>
                <p className="text-[10px] text-ink-muted">{receiptData.branch_address}</p>
                <p className="text-[10px] text-ink-muted">Telp: {receiptData.branch_phone || "021-72781001"}</p>
              </div>

              {/* Meta */}
              <div className="space-y-0.5 text-[10px] border-b border-dashed border-line-strong pb-2">
                <div className="flex justify-between">
                  <span>No. Invoice:</span>
                  <span className="font-bold">{receiptData.invoice_code}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>{receiptData.transaction_time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{receiptData.cashier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{receiptData.customer_name}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 border-b border-dashed border-line-strong pb-2">
                {(receiptData.orders || []).map((o, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="font-bold">{o.product_name || o.product?.name || "Cinema Gear"}</p>
                    <div className="flex justify-between text-ink-secondary text-[10px]">
                      <span>
                        {o.quantity} x {formatRupiah(o.unit_price)}
                      </span>
                      <span className="font-bold text-ink">{formatRupiah(o.total_price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Summary */}
              <div className="space-y-1 border-b border-dashed border-line-strong pb-2 text-[10px]">
                <div className="flex justify-between font-bold text-xs pt-1">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(receiptData.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metode Bayar:</span>
                  <span>{receiptData.payment_method}</span>
                </div>
                {receiptData.payment_method === "Cash" && (
                  <>
                    <div className="flex justify-between">
                      <span>Tunai Diterima:</span>
                      <span>{formatRupiah(receiptData.cash_tendered)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-status-success">
                      <span>KEMBALIAN:</span>
                      <span>{formatRupiah(receiptData.change_amount)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-2 space-y-1 text-[10px] text-ink-secondary">
                <p className="font-bold text-ink">TERIMA KASIH TELAH BERBELANJA DI OVERTONE PRO CINEMA</p>
                <p>Barang resmi distributor 1-2 tahun &amp; 10-Point Sensor QC certified.</p>
                <p className="text-[9px] text-ink-muted">www.overtone.id &bull; Broadcast Care: 0811-1000-500</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="primary"
                className="flex-1 justify-center"
                onClick={handlePrintReceipt}
              >
                <Printer size={15} aria-hidden="true" />
                <span>Cetak Struk Resmi</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReceiptModalOpen(false)}
              >
                Tutup &amp; Transaksi Baru
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
