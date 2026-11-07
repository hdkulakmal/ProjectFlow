import { useState, useEffect } from 'react';
import CoordinatorLayout from '../../components/CoordinatorLayout';
import api from '../../services/api';
import {
  Search,
  UserPlus,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Power
} from 'lucide-react';

export default function CoordinatorUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [alert, setAlert] = useState({ type: '', text: '' });

  // Reset Password Modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Create User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'Student',
    registrationNumber: '',
    batch: '2024',
    phoneNumber: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/users', { params });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setAlert({ type: 'error', text: 'Failed to load user list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  // Toggle user active status
  const handleToggleStatus = async (user) => {
    const nextStatus = user.isActive === false ? true : false;
    try {
      await api.patch(`/users/${user._id}/status`, { isActive: nextStatus });
      setAlert({
        type: 'success',
        text: `Account for ${user.fullName} successfully ${nextStatus ? 'activated' : 'deactivated'}.`
      });
      fetchUsers();
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.message || 'Failed to update user status.' });
    }
  };

  // Handle password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword.trim()) return;

    setIsResetting(true);
    try {
      await api.post(`/users/${resetModalUser._id}/reset-password`, { newPassword: newPassword.trim() });
      setAlert({
        type: 'success',
        text: `Password for ${resetModalUser.fullName} has been reset. Please share the temporary password.`
      });
      setResetModalUser(null);
      setNewPassword('');
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.message || 'Failed to reset password.' });
    } finally {
      setIsResetting(false);
    }
  };

  // Handle create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.post('/users', newUser);
      setAlert({ type: 'success', text: `New ${newUser.role} account created successfully!` });
      setCreateModalOpen(false);
      setNewUser({
        fullName: '',
        email: '',
        password: '',
        role: 'Student',
        registrationNumber: '',
        batch: '2024',
        phoneNumber: ''
      });
      fetchUsers();
    } catch (err) {
      setAlert({ type: 'error', text: err.response?.data?.message || 'Failed to create user.' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <CoordinatorLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/60 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">User Management</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Administer student and faculty accounts, toggle active privileges, and reset credentials.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container transition-all flex items-center gap-2 shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create New User</span>
          </button>
        </div>

        {/* Alert Feedback Banner */}
        {alert.text && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
              alert.type === 'success'
                ? 'bg-teal-50 border-teal-200 text-secondary'
                : 'bg-red-50 border-red-200 text-error'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span className="flex-1">{alert.text}</span>
            <button onClick={() => setAlert({ type: '', text: '' })}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white border border-outline-variant rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="h-4 w-4 text-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or Reg No..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-surface rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-surface rounded-lg border border-outline-variant text-on-surface font-medium focus:ring-1 focus:ring-primary"
            >
              <option value="">All Roles</option>
              <option value="Student">Students Only</option>
              <option value="Supervisor">Supervisors Only</option>
              <option value="Coordinator">Coordinators Only</option>
            </select>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 text-sm font-semibold bg-surface-container text-primary rounded-lg hover:bg-surface-container-high transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-outline-variant rounded-xl shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Reg No / Batch</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {users.length > 0 ? (
                    users.map((u) => {
                      const isActive = u.isActive !== false;
                      return (
                        <tr key={u._id} className="hover:bg-surface transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {u.fullName ? u.fullName[0].toUpperCase() : 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-primary">{u.fullName}</p>
                                <p className="text-xs text-on-surface-variant">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                u.role === 'Coordinator'
                                  ? 'bg-purple-100 text-purple-800'
                                  : u.role === 'Supervisor'
                                  ? 'bg-teal-100 text-secondary'
                                  : 'bg-blue-100 text-primary'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-on-surface">
                            {u.registrationNumber || u.batch ? (
                              <div>
                                <p className="font-semibold">{u.registrationNumber || '—'}</p>
                                <p className="text-on-surface-variant">Batch {u.batch || '—'}</p>
                              </div>
                            ) : (
                              <span className="text-outline">Faculty</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-red-600'}`} />
                              {isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setResetModalUser(u)}
                                title="Reset Password"
                                className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
                              >
                                <KeyRound className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                title={isActive ? 'Deactivate Account' : 'Activate Account'}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isActive
                                    ? 'text-on-surface-variant hover:text-error hover:bg-red-50'
                                    : 'text-secondary hover:bg-teal-50'
                                }`}
                              >
                                <Power className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-xs text-outline">
                        No users found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Reset Password */}
        {resetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-outline-variant relative">
              <button
                onClick={() => setResetModalUser(null)}
                className="absolute top-4 right-4 p-1.5 text-outline hover:text-on-surface rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center mb-3">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-primary">Reset Password</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Enter a temporary password for <strong>{resetModalUser.fullName}</strong>.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">New Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 text-sm bg-surface rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 border border-outline-variant text-xs font-semibold rounded-lg hover:bg-slate-50 text-on-surface-variant cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isResetting ? 'Resetting...' : 'Confirm Reset'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create User */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-outline-variant relative">
              <button
                onClick={() => setCreateModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-outline hover:text-on-surface rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high text-primary flex items-center justify-center mb-3">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-primary">Create New User</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Register an individual student or academic supervisor account.
                </p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    placeholder="e.g. Kamal Perera"
                    className="w-full px-3 py-2 text-xs bg-surface rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="user@vau.ac.lk"
                      className="w-full px-3 py-2 text-xs bg-surface rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">Initial Password</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 text-xs bg-surface rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-surface rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Student">Student</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Coordinator">Coordinator</option>
                  </select>
                </div>

                {newUser.role === 'Student' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1">Registration No</label>
                      <input
                        type="text"
                        value={newUser.registrationNumber}
                        onChange={(e) => setNewUser({ ...newUser, registrationNumber: e.target.value })}
                        placeholder="2020/ICT/01"
                        className="w-full px-3 py-2 text-xs bg-surface rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-on-surface mb-1">Batch</label>
                      <input
                        type="text"
                        value={newUser.batch}
                        onChange={(e) => setNewUser({ ...newUser, batch: e.target.value })}
                        placeholder="2024"
                        className="w-full px-3 py-2 text-xs bg-surface rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 border border-outline-variant text-xs font-semibold rounded-lg hover:bg-slate-50 text-on-surface-variant cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isCreating ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </CoordinatorLayout>
  );
}