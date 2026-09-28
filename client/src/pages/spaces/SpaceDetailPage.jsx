import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Users, Plus } from 'lucide-react';
import { spaces } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import socket, { joinSpace } from '../../services/socket';
import CountdownTimer from '../../components/ui/CountdownTimer';
import ProgressBar from '../../components/ui/ProgressBar';
import CreateSessionModal from './CreateSessionModal';
import { formatVND } from '../../utils/format';

export default function SpaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  
  const [space, setSpace] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    try {
      const [spaceData, sessionsData] = await Promise.all([
        spaces.getSpace(id),
        spaces.getSpaceSessions(id)
      ]);
      setSpace(spaceData);
      setActiveSessions(sessionsData || []);
      // Check membership: spaceData.members is array of { user: { id, name }, ... }
      const memberUserIds = (spaceData.members || []).map(m => m.userId || m.user?.id);
      setIsMember(memberUserIds.includes(user?.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    joinSpace(id);

    const handleSessionUpdate = () => loadData();

    socket.on('session:new', handleSessionUpdate);
    socket.on('session:updated', handleSessionUpdate);

    return () => {
      socket.off('session:new', handleSessionUpdate);
      socket.off('session:updated', handleSessionUpdate);
    };
  }, [id]);

  const handleJoinSpace = async () => {
    try {
      await spaces.joinSpace(id);
      setIsMember(true);
      loadData();
    } catch (err) {
      alert('Lỗi: ' + (err.message || 'Không thể tham gia'));
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Đang tải...</div>;
  if (!space) return <div className="text-center py-20 text-gray-500">Không tìm thấy Space</div>;

  return (
    <div className="space-y-6 pb-20 relative min-h-screen">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{space.name}</h1>
        {space.description && <p className="text-gray-600 text-sm mb-4">{space.description}</p>}
        
        <div className="flex flex-col gap-2">
          <div className="flex items-center text-sm text-gray-700 gap-2">
            <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
            <span><span className="font-medium">Điểm nhận:</span> {space.deliveryPoint}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700 gap-2">
            <Users className="w-5 h-5 text-blue-500 shrink-0" />
            <span><span className="font-medium">Thành viên:</span> {space.members?.length || space._count?.members || 0}</span>
          </div>
        </div>

        {!isMember && (
          <button 
            onClick={handleJoinSpace}
            className="w-full mt-4 bg-emerald-100 text-emerald-700 font-medium py-2.5 rounded-lg hover:bg-emerald-200 transition"
          >
            + Tham gia Space
          </button>
        )}
      </div>

      {/* Sessions List */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          Phiên đang mở 🔥
        </h2>
        
        {activeSessions.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
            <div className="text-3xl mb-2">🍜</div>
            Chưa có phiên nào đang mở.<br/>Hãy tạo phiên mới để bắt đầu gom đơn!
          </div>
        ) : (
          <div className="space-y-4">
            {activeSessions.map(session => (
              <div 
                key={session.id} 
                onClick={() => navigate(`/sessions/${session.id}`)}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition active:scale-[0.99]"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{session.restaurantName}</h3>
                  <CountdownTimer expiresAt={session.expiresAt} />
                </div>
                
                {session.minOrderValue > 0 && (
                  <div className="mt-2 mb-2">
                    <ProgressBar 
                      current={session.totalValue || 0} 
                      target={session.minOrderValue} 
                      label="Tiến độ đơn"
                    />
                  </div>
                )}
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>👥 {session.participantCount || 0} người tham gia</span>
                  <span className="font-medium text-emerald-600">{formatVND(session.totalValue || 0)}</span>
                </div>
                
                <button className="w-full mt-3 bg-emerald-50 text-emerald-600 font-medium py-2 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition">
                  Tham gia →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {isMember && (
        <button 
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-emerald-700 hover:scale-105 transition-all z-20 active:scale-95"
        >
          <Plus className="w-8 h-8" />
        </button>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSessionModal 
          spaceId={id} 
          onClose={() => setShowCreateModal(false)} 
        />
      )}
    </div>
  );
}
