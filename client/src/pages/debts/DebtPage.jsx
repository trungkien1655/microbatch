import React, { useState, useEffect } from 'react';
import { debts as debtsApi } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { formatVND } from '../../utils/format';

export default function DebtPage() {
  const user = useAuthStore(state => state.user);
  const [activeTab, setActiveTab] = useState('i_owe');
  const [debtData, setDebtData] = useState({ debtsOwed: [], debtsOwing: [] });
  const [loading, setLoading] = useState(true);

  const loadDebts = async () => {
    try {
      const data = await debtsApi.getDebts();
      setDebtData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  const handlePay = async (id) => {
    try {
      await debtsApi.payDebt(id);
      loadDebts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleConfirm = async (id) => {
    try {
      await debtsApi.confirmDebt(id);
      loadDebts();
    } catch (err) {
      alert(err.message);
    }
  };

  // debtsOwing = debts where I am fromUser (I owe)
  // debtsOwed = debts where I am toUser (others owe me)
  const iOwe = debtData.debtsOwing || [];
  const owedToMe = debtData.debtsOwed || [];

  const totalIOwe = iOwe.filter(d => d.status !== 'CONFIRMED').reduce((sum, d) => sum + d.amount, 0);
  const totalOwedToMe = owedToMe.filter(d => d.status !== 'CONFIRMED').reduce((sum, d) => sum + d.amount, 0);

  const currentList = activeTab === 'i_owe' ? iOwe : owedToMe;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-4">💰 Quản lý công nợ</h1>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
            <div className="text-sm text-red-600 mb-1">Tôi nợ</div>
            <div className="font-bold text-lg text-red-700">{formatVND(totalIOwe)}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
            <div className="text-sm text-green-600 mb-1">Nợ tôi</div>
            <div className="font-bold text-lg text-green-700">{formatVND(totalOwedToMe)}</div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-white rounded-t-xl">
        <button 
          onClick={() => setActiveTab('i_owe')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'i_owe' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500'}`}
        >
          Tôi nợ ({iOwe.length})
        </button>
        <button 
          onClick={() => setActiveTab('owed_to_me')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'owed_to_me' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500'}`}
        >
          Nợ tôi ({owedToMe.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Đang tải...</div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">
          <div className="text-3xl mb-2">🎉</div>
          Không có khoản nợ nào.
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map(debt => (
            <div key={debt.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-900">
                  {activeTab === 'i_owe' ? `Trả cho ${debt.toUser?.name || '...'}` : `Thu của ${debt.fromUser?.name || '...'}`}
                </div>
                <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                  🏪 {debt.session?.restaurantName || 'Không rõ'}
                </div>
                <div className="mt-2 font-bold text-lg text-emerald-700">
                  {formatVND(debt.amount)}
                </div>
              </div>
              
              <div className="text-right flex flex-col items-end gap-2">
                {debt.status === 'PENDING' && <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-600 rounded-full">CHƯA TRẢ</span>}
                {debt.status === 'PAID' && <span className="text-xs font-bold px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full">ĐÃ CHUYỂN</span>}
                {debt.status === 'CONFIRMED' && <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-600 rounded-full">✓ ĐÃ NHẬN</span>}

                {activeTab === 'i_owe' && debt.status === 'PENDING' && (
                  <button onClick={() => handlePay(debt.id)} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition">
                    Đã trả ✓
                  </button>
                )}
                
                {activeTab === 'owed_to_me' && debt.status === 'PAID' && (
                  <button onClick={() => handleConfirm(debt.id)} className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition">
                    Xác nhận ✓
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
