import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { auth } from '../../services/api';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.login({ identifier, password });
      login(res.user, res.token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-600 mb-2">MicroBatch 🍜</h1>
          <p className="text-gray-500">Đăng nhập để bắt đầu đặt đồ ăn</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại hoặc email</label>
            <input 
              type="text" 
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="VD: 0987654321"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-medium rounded-lg p-3 mt-2 hover:bg-emerald-700 transition-colors disabled:opacity-70"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-emerald-600 font-medium hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
