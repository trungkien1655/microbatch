import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { sessions } from '../../services/api';

export default function CreateSessionModal({ spaceId, onClose }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    restaurantName: '',
    restaurantLink: '',
    durationMinutes: 15,
    minOrderValue: '',
    minParticipants: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await sessions.createSession({
        spaceId,
        restaurantName: formData.restaurantName,
        restaurantLink: formData.restaurantLink || undefined,
        durationMinutes: formData.durationMinutes,
        minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : undefined,
        minParticipants: formData.minParticipants ? Number(formData.minParticipants) : undefined,
      });
      onClose();
      navigate(`/sessions/${data.id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-end sm:items-center" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-gray-900">🍽️ Mở phiên gom đơn</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên quán <span className="text-red-500">*</span></label>
            <input 
              required type="text"
              value={formData.restaurantName}
              onChange={e => setFormData({...formData, restaurantName: e.target.value})}
              placeholder="VD: Cơm tấm sườn bì chả"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link quán (nếu có)</label>
            <input 
              type="text"
              value={formData.restaurantLink}
              onChange={e => setFormData({...formData, restaurantLink: e.target.value})}
              placeholder="Link từ ShopeeFood, GrabFood..."
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">⏱️ Thời gian</label>
              <select 
                value={formData.durationMinutes}
                onChange={e => setFormData({...formData, durationMinutes: Number(e.target.value)})}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value={10}>10 phút</option>
                <option value={15}>15 phút</option>
                <option value={20}>20 phút</option>
                <option value={30}>30 phút</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">💰 Giá tối thiểu</label>
              <input 
                type="number" min="0"
                value={formData.minOrderValue}
                onChange={e => setFormData({...formData, minOrderValue: e.target.value})}
                placeholder="100000"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 text-white font-bold rounded-lg p-3 mt-2 hover:bg-emerald-700 transition-colors disabled:opacity-70"
          >
            {loading ? 'Đang tạo...' : '🚀 Tạo phiên'}
          </button>
        </form>
      </div>
    </div>
  );
}
