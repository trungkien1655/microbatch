import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/read', async (req, res) => {
  try {
    const updated = await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ count: updated.count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
