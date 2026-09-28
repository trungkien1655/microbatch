import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessions } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { formatVND, formatTimeAgo } from '../../utils/format';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';

export default function ContributionPage() {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadContributions = async () => {
    try {
      const data = await sessions.getMyContributions();
      setContributions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContributions();
  }, []);

  const pending = contributions.filter(c => c.status === 'PENDING');
  const contributed = contributions.filter(c => c.status === 'CONTRIBUTED');
  const totalContributed = contributed.reduce((sum, c) => sum + c.amount, 0);
  const totalPending = pending.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-4">💰 Đóng góp của tôi</h1>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-center">
            <div className="text-sm text-orange-600 mb-1">Cần góp</div>
            <div className="font-bold text-lg text-orange-700">{formatVND(totalPending)}</div>
            <div className="text-xs text-orange-500">{pending.length} phiên</div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
            <div className="text-sm text-emerald-600 mb-1">Đã góp</div>
            <div className="font-bold text-lg text-emerald-700">{formatVND(totalContributed)}</div>
            <div className="text-xs text-emerald-500">{contributed.length} phiên</div>
          </div>
        </div>
      </div>

      {/* Pending contributions first */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" /> Đang chờ góp
          </h2>
          <div className="space-y-3">
            {pending.map(c => (
              <div key={c.id}
                onClick={() => navigate(`/sessions/${c.sessionId}`)}
                className="bg-white p-4 rounded-xl shadow-sm border-2 border-orange-200 cursor-pointer hover:shadow-md transition flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-900">{c.session?.restaurantName || 'Phiên gom đơn'}</div>
                  <div className="text-xs text-gray-500 mt-1">{formatTimeAgo(c.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-bold text-lg text-orange-600">{formatVND(c.amount)}</div>
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">CHỜ GÓP</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed contributions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-500" /> Đã đóng góp
        </h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Đang tải...</div>
        ) : contributed.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">
            <div className="text-3xl mb-2">📭</div>
            Chưa có lịch sử đóng góp.
          </div>
        ) : (
          <div className="space-y-3">
            {contributed.map(c => (
              <div key={c.id}
                onClick={() => navigate(`/sessions/${c.sessionId}`)}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-900">{c.session?.restaurantName || 'Phiên gom đơn'}</div>
                  <div className="text-xs text-gray-500 mt-1">{formatTimeAgo(c.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">{formatVND(c.amount)}</div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">✓ ĐÃ GÓP</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
