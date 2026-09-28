import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { spaces as spacesApi } from '../services/api';
import socket, { authenticate } from '../services/socket';
import { Users, MapPin, Plus, ChevronRight, Building2 } from 'lucide-react';

export default function HomePage() {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [mySpaces, setMySpaces] = useState([]);
  const [allSpaces, setAllSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null); // spaceId being joined

  useEffect(() => {
    if (user?.id) authenticate(user.id);
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      const [mine, all] = await Promise.all([
        spacesApi.getSpaces(true),
        spacesApi.getSpaces(false)
      ]);
      setMySpaces(mine);
      setAllSpaces(all);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSelectSpace = async (space) => {
    const isMember = mySpaces.some(ms => ms.id === space.id);
    if (isMember) {
      navigate(`/spaces/${space.id}`);
      return;
    }
    // Auto-join then navigate
    setJoining(space.id);
    try {
      await spacesApi.joinSpace(space.id);
      navigate(`/spaces/${space.id}`);
    } catch (err) {
      alert('Lỗi: ' + (err.message || 'Không thể tham gia'));
    } finally {
      setJoining(null);
    }
  };

  const mySpaceIds = new Set(mySpaces.map(s => s.id));
  const otherSpaces = allSpaces.filter(s => !mySpaceIds.has(s.id));

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Xin chào, {user?.name}! 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Chọn địa điểm của bạn để bắt đầu gom đơn</p>
      </div>

      {/* ═══ My Spaces ═══ */}
      {mySpaces.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">⭐ Spaces của bạn</h2>
          <div className="space-y-3">
            {mySpaces.map(space => (
              <div key={space.id} onClick={() => navigate(`/spaces/${space.id}`)}
                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 cursor-pointer active:scale-[0.99] flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{space.name}</h3>
                  <div className="flex items-center text-xs text-gray-500 mt-1 gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{space.deliveryPoint}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{space._count?.members || 0}</span>
                    {space._count?.sessions > 0 && (
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">🔥 {space._count.sessions} phiên mở</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Preset Spaces (not yet joined) ═══ */}
      {otherSpaces.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">📍 Địa điểm có sẵn</h2>
          <p className="text-xs text-gray-500 mb-3 -mt-2">Chọn nơi bạn đang ở để tham gia gom đơn</p>
          <div className="space-y-3">
            {otherSpaces.map(space => (
              <div key={space.id} onClick={() => handleSelectSpace(space)}
                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 cursor-pointer active:scale-[0.99] flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{space.name}</h3>
                  <div className="flex items-center text-xs text-gray-500 mt-1 gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{space.deliveryPoint}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{space._count?.members || 0} thành viên</span>
                    {space._count?.sessions > 0 && (
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">🔥 {space._count.sessions} phiên mở</span>
                    )}
                  </div>
                </div>
                {joining === space.id ? (
                  <div className="text-xs text-gray-400 animate-pulse shrink-0">Đang vào...</div>
                ) : (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg shrink-0">Tham gia</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Empty state ═══ */}
      {loading && (
        <div className="text-center py-16 text-gray-400 animate-pulse">Đang tải...</div>
      )}
      {!loading && allSpaces.length === 0 && (
        <div className="text-center py-12 px-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-4xl mb-3">🏠</div>
          <p className="text-gray-600 font-medium">Chưa có địa điểm nào</p>
          <p className="text-gray-400 text-sm mt-1">Hãy tạo Space mới để bắt đầu!</p>
        </div>
      )}

      {/* ═══ Create new (secondary) ═══ */}
      <div className="pt-2 pb-4">
        <Link to="/spaces/new"
          className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500 hover:text-emerald-600 transition border border-dashed border-gray-300 rounded-xl hover:border-emerald-300">
          <Plus className="w-4 h-4" />
          Không thấy địa điểm của bạn? Tạo mới
        </Link>
      </div>
    </div>
  );
}
