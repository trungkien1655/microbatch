import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    
    if (!name || (!phone && !email) || !password) {
      return res.status(400).json({ error: 'Name, password, and either phone or email are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        passwordHash
      }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    res.status(201).json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Phone or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be phone or email
    
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier }
        ]
      }
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name: name.trim() }
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
