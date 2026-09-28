import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { io } from '../index.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// ─── Helper: compute bill split for a session ───
function computeBillSplit(orderItems, { shippingFee = 0, discountAmount = 0, discountPercent = 0, splitMethod = 'EQUAL' }) {
  const userTotals = {};
  let totalItemsValue = 0;

  orderItems.forEach(item => {
    const itemTotal = item.unitPrice * item.quantity;
    userTotals[item.userId] = (userTotals[item.userId] || 0) + itemTotal;
    totalItemsValue += itemTotal;
  });

  const participantIds = Object.keys(userTotals);
  const participantCount = participantIds.length;
  if (participantCount === 0) return [];

  const totalDiscount = (totalItemsValue * discountPercent / 100) + discountAmount;

  return participantIds.map(userId => {
    const subtotal = userTotals[userId];
    const shareOfDiscount = totalItemsValue > 0 ? (subtotal / totalItemsValue) * totalDiscount : 0;
    let shareOfShipping = 0;

    if (splitMethod === 'PROPORTIONAL') {
      shareOfShipping = totalItemsValue > 0 ? (subtotal / totalItemsValue) * shippingFee : 0;
    } else {
      shareOfShipping = shippingFee / participantCount;
    }

    let finalAmount = subtotal - shareOfDiscount + shareOfShipping;
    finalAmount = Math.ceil(finalAmount / 500) * 500;
    if (finalAmount < 0) finalAmount = 0;

    return { userId, subtotal, shareOfDiscount: Math.round(shareOfDiscount), shareOfShipping: Math.round(shareOfShipping), finalAmount };
  });
}

// ─── Create session ───
router.post('/', async (req, res) => {
  try {
    const { spaceId, restaurantName, restaurantLink, durationMinutes = 15, minOrderValue, minParticipants } = req.body;
    const expiresAt = new Date(Date.now() + durationMinutes * 60000);

    const session = await prisma.session.create({
      data: {
        spaceId, restaurantName, restaurantLink, durationMinutes,
        expiresAt, minOrderValue, minParticipants,
        createdBy: req.user.userId
      }
    });

    io.to(`space:${spaceId}`).emit('session:new', session);

    const members = await prisma.spaceMember.findMany({ where: { spaceId } });
    await prisma.notification.createMany({
      data: members.map(m => ({
        userId: m.userId, sessionId: session.id,
        type: 'SESSION_CREATED',
        message: `Phiên gom đơn "${restaurantName}" vừa mở!`
      }))
    });

    res.status(201).json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get session detail ───
router.get('/:id', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        orderItems: { include: { user: { select: { id: true, name: true } } } },
        contributions: { include: { user: { select: { id: true, name: true } } } },
        creator: { select: { id: true, name: true } }
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const participantIds = new Set(session.orderItems.map(item => item.userId));
    const totalValue = session.orderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const participants = Array.from(participantIds).map(userId => {
      const item = session.orderItems.find(i => i.userId === userId);
      return item ? item.user : null;
    }).filter(Boolean);

    // Contribution stats
    const contributionStats = {
      total: session.contributions.length,
      contributed: session.contributions.filter(c => c.status === 'CONTRIBUTED').length,
      contributions: session.contributions
    };

    res.json({
      ...session,
      totalValue,
      participantCount: participantIds.size,
      participants,
      contributionStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Add item to session ───
router.post('/:id/items', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session || session.status !== 'OPEN') {
      return res.status(400).json({ error: 'Phiên không ở trạng thái nhận món' });
    }

    const { itemName, quantity, unitPrice, note } = req.body;
    const item = await prisma.orderItem.create({
      data: {
        sessionId: req.params.id, userId: req.user.userId,
        itemName, quantity, unitPrice, note
      },
      include: { user: { select: { id: true, name: true } } }
    });

    io.to(`session:${req.params.id}`).emit('session:updated', { sessionId: req.params.id });
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Remove item ───
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const item = await prisma.orderItem.findUnique({ where: { id: req.params.itemId } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.userId !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });

    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session || session.status !== 'OPEN') {
      return res.status(400).json({ error: 'Phiên không ở trạng thái nhận món' });
    }

    await prisma.orderItem.delete({ where: { id: req.params.itemId } });
    io.to(`session:${req.params.id}`).emit('session:updated', { sessionId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Finalize: OPEN → AWAITING_PAYMENT ───
// Creator enters shipping/discount info, system calculates each person's share
// and creates Contribution records
router.post('/:id/finalize', async (req, res) => {
  try {
    const { shippingFee = 0, discountAmount = 0, discountPercent = 0, splitMethod = 'EQUAL', externalOrderId } = req.body;

    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { orderItems: true }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.createdBy !== req.user.userId) return res.status(403).json({ error: 'Chỉ người tạo mới có thể chốt đơn' });
    if (session.status !== 'OPEN' && session.status !== 'LOCKED') {
      return res.status(400).json({ error: 'Phiên không ở trạng thái có thể chốt' });
    }

    const splits = computeBillSplit(session.orderItems, { shippingFee, discountAmount, discountPercent, splitMethod });
    if (splits.length === 0) {
      return res.status(400).json({ error: 'Chưa có ai đặt món trong phiên này' });
    }

    // Payment deadline: 10 minutes from now
    const paymentDeadline = new Date(Date.now() + 10 * 60000);

    const contributionData = splits.map(s => ({
      sessionId: session.id,
      userId: s.userId,
      amount: s.finalAmount,
      status: 'PENDING'
    }));

    await prisma.$transaction([
      prisma.session.update({
        where: { id: session.id },
        data: {
          status: 'AWAITING_PAYMENT',
          shippingFee, discountAmount, discountPercent,
          splitMethod, externalOrderId, paymentDeadline
        }
      }),
      // Delete old contributions if re-finalizing
      prisma.contribution.deleteMany({ where: { sessionId: session.id } }),
      prisma.contribution.createMany({ data: contributionData })
    ]);

    // Notify all participants
    const notifications = splits.map(s => ({
      userId: s.userId,
      sessionId: session.id,
      type: 'AWAITING_PAYMENT',
      message: `Phiên "${session.restaurantName}" đã chốt! Bạn cần góp ${s.finalAmount.toLocaleString('vi-VN')}đ trong 10 phút.`
    }));
    await prisma.notification.createMany({ data: notifications });

    io.to(`session:${req.params.id}`).emit('session:awaiting_payment', { sessionId: req.params.id });

    // Re-fetch and return
    const updated = await prisma.session.findUnique({
      where: { id: session.id },
      include: {
        orderItems: { include: { user: { select: { id: true, name: true } } } },
        contributions: { include: { user: { select: { id: true, name: true } } } },
        creator: { select: { id: true, name: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Contribute: participant marks their share as paid ───
router.post('/:id/contribute', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { contributions: true }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'AWAITING_PAYMENT') {
      return res.status(400).json({ error: 'Phiên không ở trạng thái chờ góp tiền' });
    }

    const contribution = session.contributions.find(c => c.userId === req.user.userId);
    if (!contribution) return res.status(404).json({ error: 'Bạn không có trong phiên này' });
    if (contribution.status === 'CONTRIBUTED') {
      return res.status(400).json({ error: 'Bạn đã đánh dấu góp tiền rồi' });
    }

    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: 'CONTRIBUTED', contributedAt: new Date() }
    });

    // Check if ALL have contributed → move to ORDERED
    const allContributions = await prisma.contribution.findMany({
      where: { sessionId: req.params.id }
    });
    const allContributed = allContributions.every(c =>
      c.userId === req.user.userId ? true : c.status === 'CONTRIBUTED'
    );

    if (allContributed) {
      await prisma.session.update({
        where: { id: req.params.id },
        data: { status: 'ORDERED' }
      });

      // Notify creator
      await prisma.notification.create({
        data: {
          userId: session.createdBy,
          sessionId: session.id,
          type: 'ALL_CONTRIBUTED',
          message: `Tất cả đã góp đủ tiền cho "${session.restaurantName}"! Bạn có thể đặt hàng thật.`
        }
      });

      io.to(`session:${req.params.id}`).emit('session:all_contributed', { sessionId: req.params.id });
    }

    io.to(`session:${req.params.id}`).emit('session:contribution_updated', { sessionId: req.params.id });

    res.json({ success: true, allContributed });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Legacy lock endpoint (now just an alias for manual trigger) ───
router.post('/:id/lock', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.createdBy !== req.user.userId) return res.status(403).json({ error: 'Only creator can lock' });
    if (session.status !== 'OPEN') return res.status(400).json({ error: 'Chỉ có thể chốt phiên đang mở' });

    const updated = await prisma.session.update({
      where: { id: req.params.id },
      data: { status: 'LOCKED' }
    });

    io.to(`session:${req.params.id}`).emit('session:locked', { sessionId: req.params.id });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update delivery status ───
router.patch('/:id/delivery', async (req, res) => {
  try {
    const { deliveryStatus } = req.body;
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { orderItems: true }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.createdBy !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });

    const updateData = { deliveryStatus };
    // When ARRIVED, also mark session COMPLETED
    if (deliveryStatus === 'ARRIVED') {
      updateData.status = 'COMPLETED';
    }

    const updated = await prisma.session.update({
      where: { id: req.params.id },
      data: updateData
    });

    if (deliveryStatus === 'ARRIVED') {
      const participantIds = [...new Set(session.orderItems.map(i => i.userId))];
      await prisma.notification.createMany({
        data: participantIds.map(userId => ({
          userId, sessionId: session.id,
          type: 'ORDER_ARRIVED',
          message: `Đơn "${session.restaurantName}" đã tới điểm giao! Xuống lấy thôi 🎉`
        }))
      });
    }

    io.to(`session:${req.params.id}`).emit('session:delivery', { sessionId: req.params.id, deliveryStatus });
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get user contributions across sessions ───
router.get('/my/contributions', async (req, res) => {
  try {
    const contributions = await prisma.contribution.findMany({
      where: { userId: req.user.userId },
      include: {
        session: { select: { id: true, restaurantName: true, status: true, createdAt: true } },
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(contributions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
