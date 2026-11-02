import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search, Shield, UserCheck, UserX, Edit3, UserPlus,
  Briefcase, ShoppingBag, RefreshCw
} from "lucide-react";
import api from "../../api";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { SkeletonGrid } from "../../components/ui/Skeleton";
import { errorMessage, formatDate } from "../../utils/format";
import { useConfirm } from "../../components/ui/ConfirmDialog";

const STAFF_ROLE_LABELS = {
  super_admin: "Super Admin (Sistem & KMS)",
  manager: "Manager Retail (Approval & MIS)",
  finance: "Finance Controller (PO & Refund)",
  warehouse_staff: "Warehouse Staff (Stok & Resi)",
  store_staff: "Store Staff (Katalog & Offline Store)",
};

export default function UserManagement() {
  const confirm = useConfirm();
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

  async function handleToggleStaffStatus(staff) {
    const actionName = staff.is_active ? "nonaktifkan (suspend)" : "aktifkan kembali";
    const ok = await confirm({
      title: "Ubah Status Akses Staf",
      message: `Yakin ingin me-${actionName} akses akun staf ${staff.name}?`,
      confirmText: staff.is_active ? "Nonaktifkan" : "Aktifkan",
      isDanger: staff.is_active,
    });
    if (!ok) return;

    api.post(`/admin/staff/${staff.id}/toggle-status`)
      .then((res) => {
        toast.success(res.data?.message || "Status staf berhasil diperbarui");
        fetchData();
      })
      .catch((err) => toast.error(errorMessage(err)));
  }

  async function handleToggleCustomerStatus(cust) {
    const actionName = cust.is_active ? "memblokir" : "membuka blokir";
    const ok = await confirm({
      title: "Ubah Status Pelanggan",
      message: `Yakin ingin ${actionName} akun pelanggan ${cust.name}?`,
      confirmText: cust.is_active ? "Blokir" : "Buka Blokir",
      isDanger: cust.is_active,
    });
    if (!ok) return;

    api.post(`/admin/customers/${cust.id}/toggle-status`)
      .then((res) => {
        toast.success(res.data?.message || "Status pelanggan diperbarui");
        fetchData();
      })
      .catch((err) => toast.error(errorMessage(err)));
  }

  function openRoleModal(staff) {
    setSelectedStaff(staff);
    setNewRole(staff.role);
    setRoleModalOpen(true);
  }

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-line pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent block mb-1">
              Role-Based Access Control (RBAC)
            </span>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl tracking-tight flex items-center gap-2.5">
              <Shield className="text-accent" size={24} aria-hidden="true" /> Manajemen Akun &amp; Hak Akses
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-secondary">
              Pemisahan terisolasi antara akun Pegawai Internal (OAS) dan Direktori Musisi/Pelanggan (TPS).
            </p>
          </div>

          {activeTab === "staff" && (
            <Button
              type="button"
              variant="primary"
              onClick={() => setCreateModalOpen(true)}
            >
              <UserPlus size={15} aria-hidden="true" /> Tambah Pegawai Internal
            </Button>
          )}
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 border-b border-line pb-3" role="tablist" aria-label="Pilih direktori pengguna">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "staff"}
            onClick={() => { setActiveTab("staff"); setSearch(""); setRoleFilter(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-semibold transition-colors ${
              activeTab === "staff"
                ? "bg-ink text-canvas"
                : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
            }`}
          >
            <Briefcase size={15} aria-hidden="true" /> 1. Manajemen Staf Internal (OAS)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "customers"}
            onClick={() => { setActiveTab("customers"); setSearch(""); setRoleFilter(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-semibold transition-colors ${
              activeTab === "customers"
                ? "bg-ink text-canvas"
                : "bg-surface border border-line text-ink-secondary hover:border-line-strong hover:text-ink"
            }`}
          >
            <ShoppingBag size={15} aria-hidden="true" /> 2. Direktori Pelanggan &amp; Musisi (TPS)
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <label htmlFor="user-mgmt-search" className="sr-only">Cari pengguna</label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={15} aria-hidden="true" />
            <input
              id="user-mgmt-search"
              type="search"
              placeholder={activeTab === "staff" ? "Cari nama, email, atau username staf..." : "Cari nama, email, atau nomor HP pelanggan..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ot-input pl-9"
            />
          </form>

          {activeTab === "staff" && (
            <div>
              <label htmlFor="user-role-filter" className="sr-only">Filter role staf</label>
              <select
                id="user-role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="ot-input"
              >
                <option value="">Semua Role Staf (OAS)</option>
                <option value="super_admin">Super Admin</option>
                <option value="manager">Manager Retail</option>
                <option value="finance">Finance Controller</option>
                <option value="warehouse_staff">Warehouse Staff</option>
                <option value="store_staff">Store Staff</option>
              </select>
            </div>
          )}

          <Button type="button" variant="secondary" onClick={fetchData}>
            <RefreshCw size={14} aria-hidden="true" /> Muat Ulang
          </Button>
        </div>

        {/* Content Section */}
        {loading ? (
          <SkeletonGrid />
        ) : activeTab === "staff" ? (
          staffList.length === 0 ? (
            <EmptyState title="Tidak ada staf ditemukan" description="Coba ubah kata kunci pencarian atau filter role." />
          ) : (
            <div className="overflow-x-auto rounded-md border border-line bg-surface">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="py-3 px-4">Nama Pegawai &amp; Email</th>
                    <th className="py-3 px-4">Role Staf (OAS)</th>
                    <th className="py-3 px-4">Penempatan Cabang</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4">Bergabung</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {staffList.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ink text-sm">{s.name}</p>
                        <p className="text-ink-muted font-mono text-[11px]">{s.email} &middot; @{s.username}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status="info">
                          {STAFF_ROLE_LABELS[s.role] || s.role}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-ink-secondary">
                        {s.branch_name || "Headquarters & Central"}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge status={s.is_active ? "active" : "danger"}>
                          {s.is_active ? "Aktif" : "Dinonaktifkan"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-ink-muted tabular-nums">{formatDate(s.created_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openRoleModal(s)}
                          >
                            <Edit3 size={12} aria-hidden="true" /> Ubah Role
                          </Button>
                          <Button
                            type="button"
                            variant={s.is_active ? "danger" : "secondary"}
                            size="sm"
                            onClick={() => handleToggleStaffStatus(s)}
                          >
                            {s.is_active ? <UserX size={12} aria-hidden="true" /> : <UserCheck size={12} aria-hidden="true" />}
                            {s.is_active ? "Suspend" : "Aktifkan"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          customerList.length === 0 ? (
            <EmptyState title="Tidak ada pelanggan ditemukan" description="Belum ada musisi atau pembeli terdaftar." />
          ) : (
            <div className="overflow-x-auto rounded-md border border-line bg-surface">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    <th className="py-3 px-4">Nama Pelanggan / Musisi</th>
                    <th className="py-3 px-4">Kontak (WhatsApp / HP)</th>
                    <th className="py-3 px-4">Alamat Pengiriman</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4">Terdaftar</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {customerList.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-ink text-sm">{c.name}</p>
                        <p className="text-ink-muted font-mono text-[11px]">{c.email} &middot; @{c.username}</p>
                      </td>
                      <td className="py-3.5 px-4 text-ink-secondary tabular-nums">{c.phone || "-"}</td>
                      <td className="py-3.5 px-4 text-ink-secondary max-w-xs truncate">{c.address || "Belum diisi"}</td>
                      <td className="py-3.5 px-4">
                        <Badge status={c.is_active ? "active" : "danger"}>
                          {c.is_active ? "Aktif" : "Diblokir"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-ink-muted tabular-nums">{formatDate(c.created_at)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          type="button"
                          variant={c.is_active ? "danger" : "secondary"}
                          size="sm"
                          onClick={() => handleToggleCustomerStatus(c)}
                        >
                          {c.is_active ? <UserX size={12} aria-hidden="true" /> : <UserCheck size={12} aria-hidden="true" />}
                          {c.is_active ? "Blokir Akun" : "Buka Blokir"}
                        </Button>
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
      <Modal
        open={roleModalOpen && Boolean(selectedStaff)}
        onClose={() => setRoleModalOpen(false)}
        title="Ubah Hak Akses Role Staf"
        description={selectedStaff ? `Perbarui penugasan role untuk ${selectedStaff.name} (@${selectedStaff.username})` : ""}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button type="button" variant="secondary" onClick={() => setRoleModalOpen(false)}>
              Batal
            </Button>
            <Button type="button" variant="primary" loading={submitting} disabled={submitting} onClick={handleRoleChange}>
              {submitting ? "Menyimpan..." : "Simpan Perubahan Role"}
            </Button>
          </div>
        }
      >
        <div className="space-y-2" role="radiogroup" aria-label="Pilih role staf">
          {Object.entries(STAFF_ROLE_LABELS).map(([rKey, rLabel]) => (
            <label
              key={rKey}
              className={`flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-colors ${
                newRole === rKey
                  ? "border-ink bg-surface-muted text-ink font-bold"
                  : "border-line bg-surface text-ink-secondary hover:border-line-strong"
              }`}
            >
              <input
                type="radio"
                name="roleOption"
                value={rKey}
                checked={newRole === rKey}
                onChange={(e) => setNewRole(e.target.value)}
                className="h-4 w-4 accent-[#B83A14]"
              />
              <div>
                <p className="text-xs font-semibold text-ink">{rLabel}</p>
                <p className="text-[11px] text-ink-muted font-mono">Kode role: {rKey}</p>
              </div>
            </label>
          ))}
        </div>
      </Modal>

      {/* Modal 2: Tambah Pegawai Internal Baru */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Tambah Pegawai Internal (OAS Staff)"
        description="Buat akun staf baru untuk operasional toko retail, gudang, atau keuangan."
        size="lg"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div>
            <label htmlFor="staff-create-name" className="block text-xs font-semibold text-ink mb-1.5">
              Nama Lengkap <span className="text-accent">*</span>
            </label>
            <input
              id="staff-create-name"
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Contoh: Budi Santoso"
              className="ot-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="staff-create-username" className="block text-xs font-semibold text-ink mb-1.5">
                Username <span className="text-accent">*</span>
              </label>
              <input
                id="staff-create-username"
                type="text"
                required
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="budi_staff"
                className="ot-input"
              />
            </div>
            <div>
              <label htmlFor="staff-create-email" className="block text-xs font-semibold text-ink mb-1.5">
                Email Resmi <span className="text-accent">*</span>
              </label>
              <input
                id="staff-create-email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="budi@overtone.id"
                className="ot-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="staff-create-phone" className="block text-xs font-semibold text-ink mb-1.5">
                Nomor Handphone
              </label>
              <input
                id="staff-create-phone"
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="08123456789"
                className="ot-input tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="staff-create-password" className="block text-xs font-semibold text-ink mb-1.5">
                Password Default <span className="text-accent">*</span>
              </label>
              <input
                id="staff-create-password"
                type="text"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="ot-input font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="staff-create-role" className="block text-xs font-semibold text-ink mb-1.5">
              Penugasan Role Staf <span className="text-accent">*</span>
            </label>
            <select
              id="staff-create-role"
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              className="ot-input"
            >
              <option value="store_staff">Operational Staff (Katalog &amp; Click &amp; Collect)</option>
              <option value="warehouse_staff">Warehouse Staff (Stok Fisik, Packing &amp; Resi)</option>
              <option value="finance">Finance Controller (PO Supplier &amp; Refund)</option>
              <option value="manager">Manager Retail (MIS &amp; Approval)</option>
              <option value="super_admin">Super Administrator (RBAC Penuh)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-line flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={submitting} disabled={submitting}>
              {submitting ? "Membuat..." : "Buat Akun Pegawai"}
            </Button>
          </div>
        </form>
      </Modal>

    </DashboardLayout>
  );
}
