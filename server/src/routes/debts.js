import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { io } from '../index.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const debtsOwed = await prisma.debt.findMany({
      where: { toUserId: req.user.userId },
      include: {
        session: { select: { id: true, restaurantName: true } },
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } }
      }
    });

    const debtsOwing = await prisma.debt.findMany({
      where: { fromUserId: req.user.userId },
      include: {
        session: { select: { id: true, restaurantName: true } },
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } }
      }
    });

    res.json({ debtsOwed, debtsOwing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/pay', async (req, res) => {
  try {
    const debt = await prisma.debt.findUnique({ where: { id: req.params.id } });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    if (debt.fromUserId !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });

    const updated = await prisma.debt.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() }
    });

    const fromUser = await prisma.user.findUnique({ where: { id: req.user.userId } });

    await prisma.notification.create({
      data: {
        userId: debt.toUserId,
        sessionId: debt.sessionId,
        type: 'DEBT_PAID',
        message: `${fromUser.name} has paid their debt of ${debt.amount}.`
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/confirm', async (req, res) => {
  try {
    const debt = await prisma.debt.findUnique({ where: { id: req.params.id } });
    if (!debt) return res.status(404).json({ error: 'Debt not found' });
    if (debt.toUserId !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });

    const updated = await prisma.debt.update({
      where: { id: req.params.id },
      data: { status: 'CONFIRMED' }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
