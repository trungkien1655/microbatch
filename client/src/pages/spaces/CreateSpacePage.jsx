import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { spaces } from '../../services/api';

export default function CreateSpacePage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deliveryPoint: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await spaces.createSpace(formData);
      navigate(`/spaces/${res._id || res.id}`);
    } catch (err) {
      setError(err.message || 'Không thể tạo Space');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tạo Space mới</h1>
        <p className="text-gray-500 text-sm mt-1">Nhóm gom đơn cho công ty, tòa nhà hoặc xóm trọ</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên Space <span className="text-red-500">*</span></label>
          <input 
            required type="text"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="VD: Cư dân Tòa A"
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Điểm nhận hàng <span className="text-red-500">*</span></label>
          <input 
            required type="text"
            value={formData.deliveryPoint}
            onChange={e => setFormData({...formData, deliveryPoint: e.target.value})}
            placeholder="VD: Sảnh tầng 1 Tòa A"
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea 
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            placeholder="Mô tả ngắn gọn về nhóm..."
            rows="3"
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
          />
        </div>

        <button 
          type="submit" disabled={loading}
          className="w-full bg-emerald-600 text-white font-medium rounded-lg p-3 mt-4 hover:bg-emerald-700 transition-colors disabled:opacity-70"
        >
          {loading ? 'Đang tạo...' : 'Tạo Space'}
        </button>
      </form>
    </div>
  );
}
