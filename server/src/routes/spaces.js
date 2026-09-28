import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { my } = req.query;
    
    if (my === 'true') {
      const spaces = await prisma.space.findMany({
        where: {
          members: {
            some: { userId: req.user.userId }
          }
        },
        include: {
          _count: {
            select: { members: true, sessions: { where: { status: 'OPEN' } } }
          }
        }
      });
      return res.json(spaces);
    }

    const spaces = await prisma.space.findMany({
      include: {
        _count: {
          select: { members: true, sessions: { where: { status: 'OPEN' } } }
        }
      }
    });
    res.json(spaces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, deliveryPoint, latitude, longitude } = req.body;
    
    const space = await prisma.space.create({
      data: {
        name,
        description,
        deliveryPoint,
        latitude,
        longitude,
        createdBy: req.user.userId,
        members: {
          create: {
            userId: req.user.userId,
            role: 'ADMIN'
          }
        }
      }
    });
    
    res.status(201).json(space);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const space = await prisma.space.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, phone: true } } }
        },
        _count: {
          select: { sessions: { where: { status: 'OPEN' } } }
        }
      }
    });
    
    if (!space) return res.status(404).json({ error: 'Space not found' });
    res.json(space);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/join', async (req, res) => {
  try {
    const spaceId = req.params.id;
    const userId = req.user.userId;

    // Verify space exists
    const space = await prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }

    // Verify user exists (handles stale JWT after DB reset)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found. Please log in again.' });
    }

    const existing = await prisma.spaceMember.findUnique({
      where: { userId_spaceId: { userId, spaceId } }
    });

    if (existing) {
      return res.json({ ...existing, alreadyMember: true });
    }

    const member = await prisma.spaceMember.create({
      data: {
        spaceId,
        userId,
        role: 'MEMBER'
      }
    });
    
    res.status(201).json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/sessions', async (req, res) => {
  try {
    const { status = 'OPEN' } = req.query;
    
    const sessions = await prisma.session.findMany({
      where: { 
        spaceId: req.params.id,
        ...(status !== 'ALL' && { status })
      },
      include: {
        creator: { select: { id: true, name: true } },
        orderItems: { include: { user: { select: { id: true, name: true } } } }
      }
    });

    const enrichedSessions = sessions.map(session => {
      const participantIds = new Set(session.orderItems.map(item => item.userId));
      const totalValue = session.orderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      
      return {
        ...session,
        participantCount: participantIds.size,
        totalValue
      };
    });

    res.json(enrichedSessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
