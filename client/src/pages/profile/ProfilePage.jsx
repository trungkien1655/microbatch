import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { spaces as spacesApi, auth, sessions as sessionsApi } from '../../services/api';
import { formatVND, formatTimeAgo } from '../../utils/format';
import { MapPin, LogOut, ChevronRight, Building2, Edit2, Check, X } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [mySpaces, setMySpaces] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [spaces, contribs] = await Promise.all([
        spacesApi.getSpaces(true),
        sessionsApi.getMyContributions().catch(() => [])
      ]);
      setMySpaces(spaces);
      setContributions(contribs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
    logout();
    navigate('/login');
  };

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === user?.name) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      const res = await auth.updateName({ name: newName.trim() });
      setUser(res.user || { ...user, name: newName.trim() });
      setEditingName(false);
    } catch (err) {
      alert(err.message || 'Lỗi cập nhật tên');
    } finally {
      setSaving(false);
    }
  };

  // Derive sessions from contributions
  const sessionMap = {};
  contributions.forEach(c => {
    if (c.session && !sessionMap[c.session.id]) {
      sessionMap[c.session.id] = { ...c.session, myAmount: c.amount, contributionStatus: c.status };
    }
  });
  const allSessions = Object.values(sessionMap);
  const activeSessions = allSessions.filter(s => ['OPEN', 'AWAITING_PAYMENT', 'ORDERED', 'LOCKED'].includes(s.status));
  const completedSessions = allSessions.filter(s => ['COMPLETED', 'CANCELLED'].includes(s.status));
  const displaySessions = activeTab === 'active' ? activeSessions : completedSessions;

  const statusLabels = {
    OPEN: { text: 'Đang mở', color: 'bg-green-100 text-green-700' },
    LOCKED: { text: 'Đã chốt', color: 'bg-yellow-100 text-yellow-700' },
    AWAITING_PAYMENT: { text: 'Chờ góp', color: 'bg-orange-100 text-orange-700' },
    ORDERED: { text: 'Đã đặt', color: 'bg-blue-100 text-blue-700' },
    COMPLETED: { text: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-700' },
    CANCELLED: { text: 'Đã hủy', color: 'bg-red-100 text-red-700' },
  };

  // Avatar: first letter of name
  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="space-y-6">
      {/* ═══ Profile Card ═══ */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3 shadow-md">
          {initial}
        </div>

        {editingName ? (
          <div className="flex items-center justify-center gap-2 mb-1">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="text-xl font-bold text-center border-b-2 border-emerald-500 outline-none px-2 py-1 bg-transparent"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            />
            <button onClick={handleSaveName} disabled={saving} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
              <Check className="w-5 h-5" />
            </button>
            <button onClick={() => { setEditingName(false); setNewName(user?.name || ''); }} className="p-1 text-gray-400 hover:bg-gray-50 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
            <button onClick={() => setEditingName(true)} className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="text-sm text-gray-500 space-y-1 mt-2">
          {user?.phone && <div>📱 {user.phone}</div>}
          {user?.email && <div>✉️ {user.email}</div>}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="font-bold text-lg text-gray-900">{mySpaces.length}</div>
            <div className="text-xs text-gray-500">Spaces</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-gray-900">{allSessions.length}</div>
            <div className="text-xs text-gray-500">Phiên</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-lg text-emerald-600">
              {formatVND(contributions.filter(c => c.status === 'CONTRIBUTED').reduce((s, c) => s + c.amount, 0))}
            </div>
            <div className="text-xs text-gray-500">Đã góp</div>
          </div>
        </div>
      </div>

      {/* ═══ Spaces ═══ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">🏠 Spaces đã tham gia</h2>
        {mySpaces.length === 0 ? (
          <div className="text-center py-6 text-gray-400 bg-white rounded-xl border border-gray-100">Chưa tham gia Space nào</div>
        ) : (
          <div className="space-y-2">
            {mySpaces.map(space => (
              <div key={space.id} onClick={() => navigate(`/spaces/${space.id}`)}
                className="bg-white p-3.5 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate text-sm">{space.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{space.deliveryPoint}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Session History ═══ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">📋 Lịch sử phiên</h2>
        <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
          <button onClick={() => setActiveTab('active')}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === 'active' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500'}`}>
            Đang diễn ra ({activeSessions.length})
          </button>
          <button onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === 'completed' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500'}`}>
            Đã hoàn thành ({completedSessions.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-b-xl">Đang tải...</div>
        ) : displaySessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-b-xl border-x border-b border-gray-100">
            {activeTab === 'active' ? 'Không có phiên đang diễn ra' : 'Chưa có phiên hoàn thành'}
          </div>
        ) : (
          <div className="bg-white rounded-b-xl border-x border-b border-gray-100 divide-y divide-gray-50">
            {displaySessions.map(s => {
              const info = statusLabels[s.status] || statusLabels.OPEN;
              return (
                <div key={s.id} onClick={() => navigate(`/sessions/${s.id}`)}
                  className="p-3.5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 text-sm truncate">{s.restaurantName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(s.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.myAmount > 0 && <span className="text-sm font-medium text-gray-700">{formatVND(s.myAmount)}</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${info.color}`}>{info.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Settings ═══ */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">⚙️ Cài đặt</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          <div className="p-4 flex justify-between items-center text-gray-400 cursor-not-allowed">
            <span className="text-sm">🔔 Thông báo đẩy</span>
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Sắp có</span>
          </div>
          <button onClick={handleLogout}
            className="w-full p-4 flex items-center gap-2 text-red-600 hover:bg-red-50 transition text-sm font-medium">
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
