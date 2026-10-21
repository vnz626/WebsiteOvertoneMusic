import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search, Shield, UserCheck, UserX, Filter, Edit3, Plus, UserPlus,
  Users, Briefcase, ShoppingBag, Store, MapPin
} from "lucide-react";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage, formatDate } from "../../utils/format";

const STAFF_ROLE_COLORS = {
  super_admin: "bg-purple-50 text-purple-700 border-purple-200",
  manager: "bg-blue-50 text-blue-700 border-blue-200",
  finance: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warehouse_staff: "bg-amber-50 text-amber-800 border-amber-200",
  store_staff: "bg-teal-50 text-teal-800 border-teal-200",
};

const STAFF_ROLE_LABELS = {
  super_admin: "Super Admin (Sistem & KMS)",
  manager: "Manager Retail (Approval & MIS)",
  finance: "Finance Controller (PO & Refund)",
  warehouse_staff: "Warehouse Staff (Stok & Resi)",
  store_staff: "Store Staff (Katalog & Showroom)",
};

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState("staff"); // 'staff' | 'customers'
  const [staffList, setStaffList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Modals for staff
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "password123",
    phone: "",
    role: "store_staff",
    branch_id: "",
  });

  function fetchData() {
    setLoading(true);
    if (activeTab === "staff") {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      api.get("/admin/staff", { params })
        .then((res) => {
          setStaffList(res.data?.data || []);
        })
        .catch((err) => toast.error(errorMessage(err)))
        .finally(() => setLoading(false));
    } else {
      const params = {};
      if (search) params.search = search;
      api.get("/admin/customers", { params })
        .then((res) => {
          setCustomerList(res.data?.data || []);
        })
        .catch((err) => toast.error(errorMessage(err)))
        .finally(() => setLoading(false));
    }
  }

  useEffect(() => {
    fetchData();
  }, [activeTab, roleFilter]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchData();
  }

  // Action: Toggle Active Status OAS Staff
  function handleToggleStaffStatus(staff) {
    const actionName = staff.is_active ? "nonaktifkan (suspend)" : "aktifkan kembali";
    if (!confirm(`Yakin ingin me-${actionName} akses akun staf ${staff.name}?`)) return;

    api.post(`/admin/staff/${staff.id}/toggle-status`)
      .then((res) => {
        toast.success(res.data?.message || "Status staf berhasil diperbarui");
        fetchData();
      })
      .catch((err) => toast.error(errorMessage(err)));
  }

  // Action: Toggle Active Status TPS Customer
  function handleToggleCustomerStatus(cust) {
    const actionName = cust.is_active ? "memblokir" : "membuka blokir";
    if (!confirm(`Yakin ingin ${actionName} akun pelanggan ${cust.name}?`)) return;

    api.post(`/admin/customers/${cust.id}/toggle-status`)
      .then((res) => {
        toast.success(res.data?.message || "Status pelanggan diperbarui");
        fetchData();
      })
      .catch((err) => toast.error(errorMessage(err)));
  }

  // Action: Open Modal Role Change
  function openRoleModal(staff) {
    setSelectedStaff(staff);
    setNewRole(staff.role);
    setRoleModalOpen(true);
  }

  // Action: Save New Role
  function handleRoleChange() {
    if (!selectedStaff) return;
    setSubmitting(true);
    api.put(`/admin/staff/${selectedStaff.id}/role`, { role: newRole })
      .then((res) => {
        toast.success(res.data?.message || "Role berhasil diubah");
        setRoleModalOpen(false);
        fetchData();
      })
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setSubmitting(false));
  }

  // Action: Create Staff
  function handleCreateStaff(e) {
    e.preventDefault();
    setSubmitting(true);
    api.post("/admin/staff", createForm)
      .then((res) => {
        toast.success(res.data?.message || "Pegawai baru berhasil didaftarkan");
        setCreateModalOpen(false);
        setCreateForm({
          name: "",
          username: "",
          email: "",
          password: "password123",
          phone: "",
          role: "store_staff",
          branch_id: "",
        });
        fetchData();
      })
      .catch((err) => toast.error(errorMessage(err)))
      .finally(() => setSubmitting(false));
  }

  return (
    <DashboardLayout role="super_admin">
      <div className="space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl tracking-tight flex items-center gap-2.5">
              <Shield className="text-amber-600" size={28} /> Manajemen Akun &amp; Hak Akses
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Pemisahan terisolasi antara akun Pegawai Internal (OAS) dan Direktori Musisi/Pelanggan (TPS).
            </p>
          </div>

          {activeTab === "staff" && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-black transition"
            >
              <UserPlus size={15} /> + Tambah Pegawai Internal
            </button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex gap-3 border-b border-gray-200 pb-3">
          <button
            onClick={() => { setActiveTab("staff"); setSearch(""); setRoleFilter(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "staff"
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Briefcase size={16} /> 1. Manajemen Staf Internal (OAS)
          </button>
          <button
            onClick={() => { setActiveTab("customers"); setSearch(""); setRoleFilter(""); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "customers"
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <ShoppingBag size={16} /> 2. Direktori Pelanggan &amp; Musisi (TPS)
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={activeTab === "staff" ? "Cari nama, email, username staf..." : "Cari nama, email, nomor HP pelanggan..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none shadow-xs"
            />
          </form>

          {activeTab === "staff" && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-gray-900 focus:outline-none shadow-xs"
            >
              <option value="">Semua Role Staf (OAS)</option>
              <option value="super_admin">Super Admin</option>
              <option value="manager">Manager Retail</option>
              <option value="finance">Finance Controller</option>
              <option value="warehouse_staff">Warehouse Staff</option>
              <option value="store_staff">Store Staff</option>
            </select>
          )}

          <button
            onClick={fetchData}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-xs"
          >
            Refresh
          </button>
        </div>

        {/* Content Section */}
        {loading ? (
          <SkeletonGrid />
        ) : activeTab === "staff" ? (
          /* TAB 1: OAS STAFF */
          staffList.length === 0 ? (
            <EmptyState title="Tidak ada staf ditemukan" description="Coba ubah kata kunci pencarian atau filter role." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50/80 uppercase tracking-wider text-gray-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">Nama Pegawai &amp; Email</th>
                    <th className="py-3 px-4">Role Staf (OAS)</th>
                    <th className="py-3 px-4">Penempatan Cabang</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4">Bergabung</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                        <p className="text-gray-500 font-mono text-[11px]">{s.email} &middot; @{s.username}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block rounded-md border px-2.5 py-1 text-[11px] font-bold ${STAFF_ROLE_COLORS[s.role] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                          {STAFF_ROLE_LABELS[s.role] || s.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {s.branch_name || "Headquarters & Central"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          s.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {s.is_active ? "Aktif" : "Dinonaktifkan"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">{formatDate(s.created_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openRoleModal(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-800 hover:border-gray-900 hover:bg-gray-50 transition shadow-2xs"
                          >
                            <Edit3 size={12} /> Ubah Role
                          </button>
                          <button
                            onClick={() => handleToggleStaffStatus(s)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition shadow-2xs ${
                              s.is_active
                                ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {s.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                            {s.is_active ? "Suspend" : "Aktifkan"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAB 2: TPS CUSTOMERS */
          customerList.length === 0 ? (
            <EmptyState title="Tidak ada pelanggan ditemukan" description="Belum ada musisi atau pembeli terdaftar." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50/80 uppercase tracking-wider text-gray-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">Nama Pelanggan / Musisi</th>
                    <th className="py-3 px-4">Kontak (WhatsApp / HP)</th>
                    <th className="py-3 px-4">Alamat Pengiriman</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4">Terdaftar</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {customerList.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                        <p className="text-gray-500 font-mono text-[11px]">{c.email} &middot; @{c.username}</p>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{c.phone || "-"}</td>
                      <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">{c.address || "Belum diisi"}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          c.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {c.is_active ? "Aktif" : "Diblokir"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">{formatDate(c.created_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleCustomerStatus(c)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition shadow-2xs ${
                            c.is_active
                              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {c.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                          {c.is_active ? "Blokir Akun" : "Buka Blokir"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

      </div>

      {/* Modal 1: Ubah Role Staf OAS */}
      {roleModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-up">
            <h3 className="font-bold text-base text-gray-900">Ubah Hak Akses Role Staf</h3>
            <p className="mt-1 text-xs text-gray-500">
              Perbarui penugasan role untuk <b>{selectedStaff.name}</b> (@{selectedStaff.username}).
            </p>

            <div className="mt-4 space-y-2">
              {Object.entries(STAFF_ROLE_LABELS).map(([rKey, rLabel]) => (
                <label
                  key={rKey}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    newRole === rKey
                      ? "border-gray-900 bg-gray-50 text-gray-900 font-bold"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="roleOption"
                    value={rKey}
                    checked={newRole === rKey}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="accent-black focus:ring-black"
                  />
                  <div>
                    <p className="text-xs">{rLabel}</p>
                    <p className="text-[10px] text-gray-400">Kode role internal: {rKey}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleModalOpen(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRoleChange}
                disabled={submitting}
                className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition disabled:opacity-50"
              >
                {submitting ? "Menyimpan..." : "Simpan Perubahan Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Tambah Pegawai Internal Baru */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-up">
            <h3 className="font-bold text-lg text-gray-900">Tambah Pegawai Internal (OAS Staff)</h3>
            <p className="mt-1 text-xs text-gray-500">
              Buat akun staf baru untuk operasional toko retail, gudang, atau keuangan.
            </p>

            <form onSubmit={handleCreateStaff} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-gray-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="budi_staff"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-gray-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Resmi</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="budi@overtone.id"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor Handphone</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="08123456789"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-gray-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Password Default</label>
                  <input
                    type="text"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-gray-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Penugasan Role Staf</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 focus:border-gray-900 focus:outline-none"
                >
                  <option value="store_staff">Store Showroom Staff (Katalog &amp; Click &amp; Collect)</option>
                  <option value="warehouse_staff">Warehouse Staff (Stok Fisik, Packing &amp; Resi)</option>
                  <option value="finance">Finance Controller (PO Supplier &amp; Refund)</option>
                  <option value="manager">Manager Retail (MIS &amp; Approval)</option>
                  <option value="super_admin">Super Administrator (RBAC Penuh)</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gray-900 px-5 py-2 text-xs font-bold text-white hover:bg-black transition disabled:opacity-50"
                >
                  {submitting ? "Membuat..." : "Buat Akun Pegawai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
