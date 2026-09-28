import React, { useState, useEffect } from 'react';
import { notifications } from '../../services/api';
import { Bell, Package, Wallet, CheckCircle } from 'lucide-react';
import { formatTimeAgo } from '../../utils/format';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifs = async () => {
    try {
      const data = await notifications.getNotifications();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notifications.markAllRead();
      loadNotifs();
    } catch (err) {
      alert(err.message);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'SESSION_FINALIZED': return <Wallet className="w-5 h-5 text-yellow-600" />;
      case 'DELIVERY_ARRIVED': return <Package className="w-5 h-5 text-green-600" />;
      default: return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  if (loading) return <div className="p-4 text-center">Đang tải...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">Thông báo</h1>
        <button onClick={handleMarkAllRead} className="text-emerald-600 text-sm font-medium hover:underline">
          Đánh dấu đã đọc
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white rounded-xl">Không có thông báo nào.</div>
      ) : (
        <div className="space-y-2">
          {items.map(notif => (
            <div 
              key={notif._id || notif.id} 
              className={`p-4 rounded-xl flex gap-3 ${!notif.read ? 'bg-emerald-50 border border-emerald-100' : 'bg-white border border-gray-100'}`}
            >
              <div className="mt-0.5">{getIcon(notif.type)}</div>
              <div>
                <p className={`text-sm ${!notif.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                  {notif.message}
                </p>
                <span className="text-xs text-gray-400 mt-1 block">{formatTimeAgo(notif.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
