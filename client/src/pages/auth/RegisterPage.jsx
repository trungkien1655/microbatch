import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../services/api';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.register(formData);
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-600 mb-2">MicroBatch 🍜</h1>
          <p className="text-gray-500">Tạo tài khoản mới</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên hiển thị</label>
            <input 
              type="text" name="name" required
              value={formData.name} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="VD: Nguyễn Văn A"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input 
              type="tel" name="phone" required
              value={formData.phone} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="VD: 0987654321"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" name="email" required
              value={formData.email} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="VD: email@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input 
              type="password" name="password" required
              value={formData.password} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 text-white font-medium rounded-lg p-3 mt-2 hover:bg-emerald-700 transition-colors disabled:opacity-70"
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-emerald-600 font-medium hover:underline">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
