import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  UserPlus, 
  Shield, 
  Mail, 
  Key, 
  User, 
  X, 
  Check, 
  Calendar,
  Sparkles
} from 'lucide-react';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'motion/react';

interface LocalUser {
  uid: string;
  displayName: string;
  email: string;
  role: 'teacher' | 'student';
  createdAt: string;
  username?: string;
  password?: string;
}

export default function UserManagementPage() {
  const { isTeacher } = useAuth();
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'student'>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    role: 'student' as 'teacher' | 'student'
  });

  const [editingUser, setEditingUser] = useState<LocalUser | null>(null);

  useEffect(() => {
    // Only fetch if teacher
    if (isTeacher) {
      fetchUsers();
    }
  }, [isTeacher]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const list: LocalUser[] = [];
      querySnapshot.forEach((doc) => {
        list.push({ uid: doc.id, ...doc.data() } as LocalUser);
      });
      // Sort by display name alphabetically
      list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      setUsers(list);
    } catch (err) {
      console.error("Error fetching users:", err);
      Swal.fire('Error', 'Gagal memuat daftar user.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uname = formData.username.trim().toLowerCase();
    const name = formData.displayName.trim();
    const email = formData.email.trim();
    const pass = formData.password.trim();

    if (!uname || !name || !email || !pass) {
      Swal.fire('Gagal', 'Semua kolom wajib diisi!', 'warning');
      return;
    }

    // Validasi id matching alphanumeric sahaja
    if (!/^[a-zA-Z0-9_\-]+$/.test(uname)) {
      Swal.fire('Format Salah', 'Username hanya boleh berisi huruf, angka, underscore, atau minus.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      // Periksa apakah username sudah terpakai
      const userDocRef = doc(db, 'users', uname);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        Swal.fire('Username Terpakai', `Username "${uname}" sudah dimiliki oleh akun lain. Silakan gunakan username lain.`, 'error');
        setSubmitting(false);
        return;
      }

      const newUser: LocalUser = {
        uid: uname,
        username: uname,
        displayName: name,
        email: email,
        password: pass,
        role: formData.role,
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, newUser);
      
      Swal.fire({
        title: 'User Berhasil Ditambahkan!',
        text: `Akun baru dengan username "${uname}" siap digunakan.`,
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });

      setShowAddModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Terjadi kesalahan saat menambahkan user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const name = formData.displayName.trim();
    const email = formData.email.trim();
    const pass = formData.password.trim();

    if (!name || !email || !pass) {
      Swal.fire('Gagal', 'Nama, email, dan password wajib diisi!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const userRef = doc(db, 'users', editingUser.uid);
      await updateDoc(userRef, {
        displayName: name,
        email: email,
        password: pass,
        role: formData.role
      });

      Swal.fire({
        title: 'User Diperbarui!',
        text: 'Data user berhasil diupdate.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      setShowEditModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Gagal memperbarui data user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: LocalUser) => {
    if (u.uid === 'mock-teacher-fais' || u.username === 'fais') {
      Swal.fire('Ditolak', 'Akun dosen utama "fais" tidak boleh dihapus.', 'error');
      return;
    }

    const { isConfirmed } = await Swal.fire({
      title: 'Hapus Akun?',
      text: `Apakah Anda yakin ingin menghapus user "${u.displayName}" (${u.uid})? Semua data profil akan terhapus permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (isConfirmed) {
      try {
        await deleteDoc(doc(db, 'users', u.uid));
        Swal.fire('Dihapus!', 'Akun user berhasil dihapus dari sistem.', 'success');
        fetchUsers();
      } catch (err) {
        console.error(err);
        Swal.fire('Gagal', 'Ada masalah saat menghapus user.', 'error');
      }
    }
  };

  const openEditModal = (u: LocalUser) => {
    setEditingUser(u);
    setFormData({
      username: u.username || u.uid,
      displayName: u.displayName,
      email: u.email,
      password: u.password || '',
      role: u.role
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      displayName: '',
      email: '',
      password: '',
      role: 'student'
    });
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.username || user.uid).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalTeachers = users.filter(u => u.role === 'teacher').length;
  const totalStudents = users.filter(u => u.role === 'student').length;

  if (!isTeacher) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="bg-red-50 dark:bg-red-950/20 p-8 rounded-[2rem] border border-red-200 dark:border-red-900 max-w-lg mx-auto">
          <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-900 dark:text-red-400 uppercase tracking-tight">Akses Ditolak</h2>
          <p className="text-slate-500 font-medium text-sm mt-2 leading-relaxed">
            Halaman Manajemen User hanya dapat diakses oleh akun Dosen / Pengajar lms_tif. Silakan masuk menggunakan akun Dosen utama.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <span className="inline-flex items-center px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-white/5">
              👥 System Administrator Control
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase leading-none">
              Manajemen <span className="text-blue-500">Akun User</span>
            </h1>
            <p className="text-slate-400 font-medium text-sm sm:text-base max-w-xl leading-relaxed">
              Tambahkan akun baru (Dosen atau Mahasiswa) dan edit data credential profil secara dinamis untuk memudahkan akses penugasan dan pengawasan.
            </p>
          </div>
          
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="w-full md:w-auto inline-flex items-center justify-center px-8 py-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-500/25 border border-white/5 active:scale-95 shrink-0 hover:-translate-y-0.5"
            id="add-user-btn"
          >
            <UserPlus className="w-4 h-4 mr-3" />
            Tambah User Baru
          </button>
        </div>
      </div>

      {/* Aggregate Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <Users className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-100 dark:text-slate-800/10" />
          <div className="relative z-10 flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Akun Terdaftar</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{users.length}</h2>
              <span className="text-xs font-bold text-slate-400 uppercase">Profil aktif</span>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 text-blue-50 dark:text-slate-800/10" />
          <div className="relative z-10 flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Mahasiswa</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter text-blue-600">{totalStudents}</h2>
              <span className="text-xs font-bold text-slate-400 uppercase">Student</span>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <Shield className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-50 dark:text-slate-800/10" />
          <div className="relative z-10 flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Dosen</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter text-indigo-600">{totalTeachers}</h2>
              <span className="text-xs font-bold text-slate-400 uppercase">Teacher / Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lists / Search Control */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Daftar Akun User</h2>
            <p className="text-slate-400 font-medium text-xs mt-1">Cari dan modifikasi data nama, email, role, sandi login akun lms_tif.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari nama, email, username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold text-xs dark:text-white"
              />
            </div>

            {/* Role filter */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full sm:w-auto">
              {(['all', 'teacher', 'student'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all w-full sm:w-auto ${
                    roleFilter === r
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {r === 'all' ? 'Semua' : r === 'teacher' ? 'Dosen' : 'Siswa'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Table container */}
        <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-800">
          {loading ? (
            <div className="p-20 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Memuat Database User...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 font-bold uppercase tracking-widest">Tidak ada user ditemukan.</p>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="mt-2 text-blue-600 font-black text-xs uppercase hover:underline">
                  Reset Pencarian
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-5 pl-8">Nama & ID Login</th>
                  <th className="p-5">Surel / Email</th>
                  <th className="p-5">Hak Akses</th>
                  <th className="p-5">Credentials</th>
                  <th className="p-5">Tanggal Dibuat</th>
                  <th className="p-5 pr-8 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                    {/* Display Name */}
                    <td className="p-5 pl-8">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black border ${
                          user.role === 'teacher' 
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900/40' 
                            : 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-900/40'
                        }`}>
                          {user.displayName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-white text-sm uppercase leading-tight">{user.displayName}</p>
                          <p className="font-mono text-[10px] text-slate-400 mt-1">Username: {user.username || user.uid}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="p-5">
                      <span className="font-medium text-slate-600 dark:text-slate-400 text-xs">{user.email || '—'}</span>
                    </td>

                    {/* Role */}
                    <td className="p-5">
                      {user.role === 'teacher' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-900/40">
                          👮 Dosen / Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/40">
                          🎓 Mahasiswa
                        </span>
                      )}
                    </td>

                    {/* Password */}
                    <td className="p-5">
                      <div className="space-y-1 font-mono text-[10px]">
                        <p className="text-slate-500"><span className="text-[8px] font-black uppercase tracking-wider text-slate-400 px-1 border border-slate-200 rounded">Sandis</span> {user.password || '●●●●●● (OAuth)'}</p>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="p-5">
                      <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px] uppercase">
                        <Calendar className="w-3 h-3" />
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-5 pr-8 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="p-2 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 text-slate-500 hover:text-blue-600 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-750 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                          title="Edit User"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(user)}
                          disabled={user.uid === 'mock-teacher-fais' || user.username === 'fais'}
                          className={`p-2 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 text-slate-400 hover:text-red-600 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-red-950/20 dark:text-slate-500 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer ${
                            (user.uid === 'mock-teacher-fais' || user.username === 'fais') ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                          title="Hapus User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-8">
                <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-100/10 dark:bg-blue-900/30 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-500/10">
                  🆕 Tambah Akun
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2.5">
                  Daftarkan Akun Baru
                </h3>
                <p className="text-slate-400 font-medium text-xs mt-1">Gunakan form ini untuk membuat kredensial login lms_tif manual.</p>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-5">
                {/* ID / Username */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Username / ID Login (Unik)
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="Contoh: budi, ani, handoko"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-blue-600 rounded-xl outline-none transition-all dark:text-white font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Nama Lengkap / Tampilan
                  </label>
                  <div className="relative">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama lengkap user..."
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-blue-600 rounded-xl outline-none transition-all dark:text-white font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Email Kontak
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      placeholder="Contoh: student@lms-tif.id"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-blue-600 rounded-xl outline-none transition-all dark:text-white font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Sandi / Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan kata sandi login..."
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-blue-600 rounded-xl outline-none transition-all dark:text-white font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Hak Akses / Role
                  </label>
                  <div className="grid grid-cols-2 gap-3.5">
                    {(['student', 'teacher'] as const).map((rl) => (
                      <button
                        key={rl}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: rl })}
                        className={`py-3.5 px-4 rounded-xl border-2 font-black uppercase text-[10px] tracking-wider transition-all ${
                          formData.role === rl
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/10'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        {rl === 'student' ? '🎓 Mahasiswa' : '👮 Dosen / Admin'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="w-1/2 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-1/2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/15 disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Tambah Akun'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <button 
                onClick={() => setShowEditModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="mb-8">
                <span className="inline-flex items-center px-2.5 py-0.5 bg-yellow-100/10 dark:bg-yellow-900/30 text-yellow-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-yellow-500/10">
                  ⚙️ Edit Akun
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mt-2.5">
                  Ubah Data Profil
                </h3>
                <p className="text-slate-400 font-medium text-xs mt-1">Ubah nama, email, sandi, atau hak akses user "{editingUser.displayName}"</p>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-5">
                {/* ID / Username (READ-ONLY) */}
                <div className="space-y-1.5 opacity-60">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Username / ID Login (Tidak dapat diubah)
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      disabled
                      value={formData.username}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-100 dark:bg-slate-850 border-2 border-slate-200 dark:border-slate-750 rounded-xl outline-none transition-all text-slate-500 font-bold text-xs cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Nama Lengkap / Tampilan
                  </label>
                  <div className="relative">
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama lengkap user..."
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-blue-600 rounded-xl outline-none transition-all dark:text-white font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Email Kontak
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      placeholder="Contoh: student@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-blue-600 rounded-xl outline-none transition-all dark:text-white font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Sandi / Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan sandi masuk..."
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-blue-600 rounded-xl outline-none transition-all dark:text-white font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Hak Akses / Role
                  </label>
                  <div className="grid grid-cols-2 gap-3.5">
                    {(['student', 'teacher'] as const).map((rl) => (
                      <button
                        key={rl}
                        type="button"
                        disabled={editingUser.uid === 'mock-teacher-fais' || editingUser.username === 'fais'}
                        onClick={() => setFormData({ ...formData, role: rl })}
                        className={`py-3.5 px-4 rounded-xl border-2 font-black uppercase text-[10px] tracking-wider transition-all ${
                          formData.role === rl
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/10'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:text-slate-700'
                        } ${(editingUser.uid === 'mock-teacher-fais' || editingUser.username === 'fais') ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {rl === 'student' ? '🎓 Mahasiswa' : '👮 Dosen / Admin'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="w-1/2 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-1/2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/15 disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
