import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, ExternalLink, Plus, X, Wallet, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { sessions } from '../../services/api';
import socket, { joinSession, leaveSession } from '../../services/socket';
import { useAuthStore } from '../../stores/authStore';
import CountdownTimer from '../../components/ui/CountdownTimer';
import ProgressBar from '../../components/ui/ProgressBar';
import { formatVND } from '../../utils/format';

export default function SessionDetailPage() {
  const { id } = useParams();
  const user = useAuthStore(state => state.user);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [contributing, setContributing] = useState(false);

  const [newItem, setNewItem] = useState({ itemName: '', unitPrice: '', quantity: 1, note: '' });
  const [finalizeData, setFinalizeData] = useState({
    shippingFee: '', discountAmount: '', discountPercent: 0,
    splitMethod: 'EQUAL', externalOrderId: ''
  });

  const loadSession = async () => {
    try {
      const data = await sessions.getSession(id);
      setSession(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
    joinSession(id);
    const refresh = () => loadSession();
    socket.on('session:updated', refresh);
    socket.on('session:locked', refresh);
    socket.on('session:awaiting_payment', refresh);
    socket.on('session:contribution_updated', refresh);
    socket.on('session:all_contributed', refresh);
    socket.on('session:delivery', refresh);
    socket.on('session:recalculated', refresh);
    socket.on('session:cancelled', refresh);
    return () => {
      leaveSession(id);
      socket.off('session:updated', refresh);
      socket.off('session:locked', refresh);
      socket.off('session:awaiting_payment', refresh);
      socket.off('session:contribution_updated', refresh);
      socket.off('session:all_contributed', refresh);
      socket.off('session:delivery', refresh);
      socket.off('session:recalculated', refresh);
      socket.off('session:cancelled', refresh);
    };
  }, [id]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await sessions.addItem(id, {
        itemName: newItem.itemName, unitPrice: Number(newItem.unitPrice),
        quantity: newItem.quantity, note: newItem.note
      });
      setShowAddItem(false);
      setNewItem({ itemName: '', unitPrice: '', quantity: 1, note: '' });
      loadSession();
    } catch (err) { alert(err.message); }
  };

  const handleRemoveItem = async (itemId) => {
    if (!confirm('Xóa món này?')) return;
    try { await sessions.removeItem(id, itemId); loadSession(); }
    catch (err) { alert(err.message); }
  };

  const handleLock = async () => {
    if (!confirm('Chốt đơn? Không ai có thể thêm món nữa.')) return;
    try { await sessions.lockSession(id); loadSession(); }
    catch (err) { alert(err.message); }
  };

  const handleFinalize = async (e) => {
    e.preventDefault();
    try {
      await sessions.finalizeSession(id, {
        shippingFee: Number(finalizeData.shippingFee) || 0,
        discountAmount: Number(finalizeData.discountAmount) || 0,
        discountPercent: Number(finalizeData.discountPercent) || 0,
        splitMethod: finalizeData.splitMethod,
        externalOrderId: finalizeData.externalOrderId
      });
      loadSession();
    } catch (err) { alert(err.message); }
  };

  const handleContribute = async () => {
    if (!confirm('Xác nhận bạn đã góp phần tiền của mình?')) return;
    setContributing(true);
    try { await sessions.contribute(id); loadSession(); }
    catch (err) { alert(err.message); }
    finally { setContributing(false); }
  };

  const updateDelivery = async (deliveryStatus) => {
    try { await sessions.updateDelivery(id, { deliveryStatus }); loadSession(); }
    catch (err) { alert(err.message); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">Đang tải...</div>;
  if (!session) return <div className="text-center py-20 text-gray-500">Không tìm thấy phiên</div>;

  const isCreator = session.createdBy === user?.id || session.creator?.id === user?.id;
  const orderItems = session.orderItems || [];
  const contributions = session.contributions || [];
  const stats = session.contributionStats || { total: 0, contributed: 0, contributions: [] };

  // Status display
  const statusMap = {
    OPEN: { color: 'bg-green-100 text-green-700', text: 'ĐANG MỞ' },
    LOCKED: { color: 'bg-yellow-100 text-yellow-700', text: 'ĐÃ CHỐT' },
    AWAITING_PAYMENT: { color: 'bg-orange-100 text-orange-700', text: 'CHỜ GÓP TIỀN' },
    ORDERED: { color: 'bg-blue-100 text-blue-700', text: 'ĐÃ ĐẶT HÀNG' },
    COMPLETED: { color: 'bg-emerald-100 text-emerald-700', text: 'HOÀN THÀNH' },
    CANCELLED: { color: 'bg-red-100 text-red-700', text: 'ĐÃ HỦY' },
  };
  const statusInfo = statusMap[session.status] || statusMap.OPEN;

  // Group items by user
  const userItems = {};
  orderItems.forEach(item => {
    const userId = item.user?.id || item.userId;
    const userName = item.user?.name || 'Người dùng';
    if (!userItems[userId]) userItems[userId] = { name: userName, items: [], total: 0 };
    userItems[userId].items.push(item);
    userItems[userId].total += item.unitPrice * item.quantity;
  });
  const totalValue = session.totalValue || orderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  // My contribution
  const myContribution = contributions.find(c => c.userId === user?.id);

  // Delivery
  const deliverySteps = ['PENDING', 'DELIVERING', 'ARRIVED'];
  const deliveryLabels = { PENDING: 'Chờ giao', DELIVERING: 'Đang giao', ARRIVED: 'Đã đến!' };
  const currentDeliveryIdx = deliverySteps.indexOf(session.deliveryStatus);

  return (
    <div className="space-y-5 pb-24">
      {/* ─── Header Card ─── */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-1">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {session.restaurantName}
            {session.restaurantLink && (
              <a href={session.restaurantLink} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 text-blue-500" />
              </a>
            )}
          </h1>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
        </div>
        <div className="text-xs text-gray-500 mb-3">Tạo bởi {session.creator?.name || '...'}</div>

        {/* Countdown for OPEN */}
        {session.status === 'OPEN' && (
          <div className="my-3 text-center bg-gray-50 py-4 rounded-xl">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Thời gian nhận món</div>
            <div className="text-4xl"><CountdownTimer expiresAt={session.expiresAt} /></div>
          </div>
        )}

        {/* Payment countdown for AWAITING_PAYMENT */}
        {session.status === 'AWAITING_PAYMENT' && session.paymentDeadline && (
          <div className="my-3 text-center bg-orange-50 py-4 rounded-xl border border-orange-200">
            <div className="text-xs text-orange-600 mb-1 uppercase tracking-wide font-medium">⏳ Hạn góp tiền</div>
            <div className="text-4xl"><CountdownTimer expiresAt={session.paymentDeadline} /></div>
            <div className="text-xs text-orange-500 mt-1">Sau thời hạn, người chưa góp sẽ bị loại tự động</div>
          </div>
        )}

        {/* Progress */}
        {session.status === 'OPEN' && session.minOrderValue > 0 && (
          <div className="mt-3">
            <ProgressBar current={totalValue} target={session.minOrderValue} label="Tiến độ đơn hàng" />
          </div>
        )}

        <div className="mt-3 flex justify-between text-sm text-gray-600 font-medium bg-emerald-50 p-3 rounded-lg">
          <span>👥 {session.participantCount || Object.keys(userItems).length} người</span>
          <span className="text-emerald-700 font-bold">Tổng: {formatVND(totalValue)}</span>
        </div>

        {/* Creator: Lock button when OPEN */}
        {isCreator && session.status === 'OPEN' && (
          <button onClick={handleLock}
            className="w-full mt-4 bg-yellow-500 text-white font-medium py-2.5 rounded-lg hover:bg-yellow-600 transition flex items-center justify-center gap-2">
            <Lock className="w-4 h-4" /> Chốt đơn ngay
          </button>
        )}
      </div>

      {/* ─── AWAITING_PAYMENT: Contribution Panel ─── */}
      {session.status === 'AWAITING_PAYMENT' && (
        <div className="bg-white p-5 rounded-xl shadow-sm border-2 border-orange-200">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            💰 Trạng thái góp quỹ
          </h2>

          {/* Progress bar for contributions */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Tiến độ góp tiền</span>
              <span className="font-bold text-orange-600">{stats.contributed}/{stats.total} người</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${stats.contributed === stats.total ? 'bg-emerald-500' : 'bg-orange-500'}`}
                style={{ width: `${stats.total > 0 ? (stats.contributed / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Each participant's contribution status */}
          <div className="space-y-2 mb-4">
            {contributions.map(c => (
              <div key={c.id} className={`flex justify-between items-center p-3 rounded-lg ${c.status === 'CONTRIBUTED' ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  {c.status === 'CONTRIBUTED'
                    ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                    : <Clock className="w-5 h-5 text-orange-500" />
                  }
                  <span className="font-medium text-gray-800">
                    {c.user?.name || 'User'}
                    {c.userId === user?.id && <span className="text-xs text-emerald-600 ml-1">(Bạn)</span>}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{formatVND(c.amount)}</div>
                  <div className={`text-[10px] font-bold ${c.status === 'CONTRIBUTED' ? 'text-emerald-600' : 'text-orange-500'}`}>
                    {c.status === 'CONTRIBUTED' ? '✓ Đã góp' : 'Chưa góp'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* My action button */}
          {myContribution && myContribution.status === 'PENDING' && (
            <button onClick={handleContribute} disabled={contributing}
              className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition text-lg disabled:opacity-60 flex items-center justify-center gap-2">
              <Wallet className="w-5 h-5" />
              {contributing ? 'Đang xử lý...' : `Tôi đã góp ${formatVND(myContribution.amount)}`}
            </button>
          )}
          {myContribution && myContribution.status === 'CONTRIBUTED' && (
            <div className="text-center py-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700 font-medium">
              ✅ Bạn đã góp phần của mình. Đang chờ những người còn lại...
            </div>
          )}
        </div>
      )}

      {/* ─── ORDERED: All contributed, delivery tracking ─── */}
      {(session.status === 'ORDERED' || session.status === 'COMPLETED') && (
        <>
          {/* Bill Summary */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-3">💰 Đóng góp của mọi người</h2>

            {(session.shippingFee > 0 || session.discountAmount > 0) && (
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="bg-red-50 p-2.5 rounded-lg text-center">
                  <div className="text-red-600 text-xs">Phí ship</div>
                  <div className="font-bold text-red-700">{formatVND(session.shippingFee)}</div>
                </div>
                <div className="bg-green-50 p-2.5 rounded-lg text-center">
                  <div className="text-green-600 text-xs">Giảm giá</div>
                  <div className="font-bold text-green-700">-{formatVND(session.discountAmount)}</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {contributions.map(c => (
                <div key={c.id} className={`flex justify-between items-center p-3 rounded-lg ${c.userId === user?.id ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
                  <span className="font-medium text-gray-800">
                    {c.user?.name || 'User'}
                    {c.userId === user?.id && <span className="text-xs ml-1.5 text-emerald-600">(Bạn)</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600">{formatVND(c.amount)}</span>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
              ))}
            </div>

            {session.externalOrderId && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                <span className="font-medium">Mã đơn:</span> {session.externalOrderId}
              </div>
            )}

            {session.status === 'ORDERED' && isCreator && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700 border border-green-200">
                🎉 Tất cả đã góp đủ tiền! Bạn có thể đặt hàng thật trên app giao đồ ăn.
              </div>
            )}
          </div>

          {/* Delivery Status */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🚚 Trạng thái giao hàng</h2>

            <div className="flex items-center justify-between mb-4">
              {deliverySteps.map((step, idx) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx <= currentDeliveryIdx ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {idx <= currentDeliveryIdx ? '✓' : idx + 1}
                    </div>
                    <span className={`text-[10px] mt-1 font-medium ${idx <= currentDeliveryIdx ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {deliveryLabels[step]}
                    </span>
                  </div>
                  {idx < deliverySteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${idx < currentDeliveryIdx ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>

            {session.deliveryStatus === 'ARRIVED' && (
              <div className="bg-green-100 text-green-800 p-4 rounded-xl text-center font-bold text-lg">
                🎉 Đồ ăn đã đến! Xuống lấy thôi!
              </div>
            )}

            {isCreator && session.status === 'ORDERED' && session.deliveryStatus !== 'ARRIVED' && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={() => updateDelivery('DELIVERING')}
                  className={`py-2.5 rounded-lg text-xs font-bold transition ${session.deliveryStatus === 'DELIVERING' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>
                  🏍️ Đang giao
                </button>
                <button onClick={() => updateDelivery('ARRIVED')}
                  className="py-2.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 transition">
                  ✅ Đã đến
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── CANCELLED ─── */}
      {session.status === 'CANCELLED' && (
        <div className="bg-red-50 p-5 rounded-xl border border-red-200 text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-red-700">Phiên đã bị hủy</h2>
          <p className="text-red-600 text-sm mt-1">Không có ai góp tiền đúng hạn.</p>
        </div>
      )}

      {/* ─── Order Items List ─── */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">📋 Danh sách món</h2>
        {Object.keys(userItems).length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
            Chưa có ai đặt món. Hãy thêm món đầu tiên!
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(userItems).map(([userId, uInfo]) => (
              <div key={userId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                  <span className="font-bold text-gray-800">{uInfo.name}</span>
                  <span className="font-medium text-emerald-600">{formatVND(uInfo.total)}</span>
                </div>
                <div className="space-y-2.5">
                  {uInfo.items.map(item => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{item.itemName}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">x{item.quantity}</span>
                        </div>
                        {item.note && <div className="text-xs text-gray-500 italic mt-0.5">📝 {item.note}</div>}
                        <div className="text-sm text-gray-500">{formatVND(item.unitPrice)}</div>
                      </div>
                      {item.userId === user?.id && session.status === 'OPEN' && (
                        <button onClick={() => handleRemoveItem(item.id)}
                          className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Finalize Form (Creator, when OPEN or LOCKED) ─── */}
      {isCreator && (session.status === 'OPEN' || session.status === 'LOCKED') && (
        <div className="bg-white p-5 rounded-xl shadow-sm border-2 border-emerald-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" /> Chốt đơn & tính tiền
          </h2>
          <form onSubmit={handleFinalize} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phí ship (đ)</label>
              <input type="number" min="0" value={finalizeData.shippingFee}
                onChange={e => setFinalizeData({...finalizeData, shippingFee: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="15000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Giảm giá (đ)</label>
              <input type="number" min="0" value={finalizeData.discountAmount}
                onChange={e => setFinalizeData({...finalizeData, discountAmount: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="40000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã đơn hàng (nếu có)</label>
              <input type="text" value={finalizeData.externalOrderId}
                onChange={e => setFinalizeData({...finalizeData, externalOrderId: e.target.value})}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="VD: GF-123456" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cách chia ship</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFinalizeData({...finalizeData, splitMethod: 'EQUAL'})}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition ${finalizeData.splitMethod === 'EQUAL' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-300 text-gray-600'}`}>
                  Chia đều
                </button>
                <button type="button" onClick={() => setFinalizeData({...finalizeData, splitMethod: 'PROPORTIONAL'})}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition ${finalizeData.splitMethod === 'PROPORTIONAL' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-300 text-gray-600'}`}>
                  Theo tỷ lệ
                </button>
              </div>
            </div>
            <button type="submit"
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-lg hover:bg-emerald-700 transition text-lg">
              🚀 Chốt & Yêu cầu góp tiền
            </button>
          </form>
        </div>
      )}

      {/* ─── Floating Add Item Button (OPEN only) ─── */}
      {session.status === 'OPEN' && (
        <div className="fixed bottom-16 left-0 right-0 p-3 z-20 max-w-md mx-auto">
          <button onClick={() => setShowAddItem(true)}
            className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition active:scale-[0.98]">
            <Plus className="w-5 h-5" /> Thêm món
          </button>
        </div>
      )}

      {/* ─── Add Item Modal ─── */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-end sm:items-center" onClick={() => setShowAddItem(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">🍽️ Thêm món</h2>
              <button onClick={() => setShowAddItem(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên món <span className="text-red-500">*</span></label>
                <input required type="text" value={newItem.itemName} onChange={e => setNewItem({...newItem, itemName: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="VD: Cơm sườn trứng" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá (đ) <span className="text-red-500">*</span></label>
                  <input required type="number" min="0" value={newItem.unitPrice} onChange={e => setNewItem({...newItem, unitPrice: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="35000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                  <div className="flex items-center">
                    <button type="button" onClick={() => setNewItem({...newItem, quantity: Math.max(1, newItem.quantity - 1)})} className="px-4 py-3 bg-gray-100 rounded-l-lg border border-gray-300 border-r-0 hover:bg-gray-200 font-bold">−</button>
                    <input type="number" min="1" value={newItem.quantity} readOnly className="w-full border-y border-gray-300 p-3 text-center outline-none bg-white" />
                    <button type="button" onClick={() => setNewItem({...newItem, quantity: newItem.quantity + 1})} className="px-4 py-3 bg-gray-100 rounded-r-lg border border-gray-300 border-l-0 hover:bg-gray-200 font-bold">+</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <input type="text" value={newItem.note} onChange={e => setNewItem({...newItem, note: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="VD: Không hành, ít đá..." />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold p-3 rounded-lg mt-2 hover:bg-emerald-700 transition">
                Thêm vào đơn
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
