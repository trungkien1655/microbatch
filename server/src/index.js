import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import spaceRoutes from './routes/spaces.js';
import sessionRoutes from './routes/sessions.js';
import debtRoutes from './routes/debts.js';
import notificationRoutes from './routes/notifications.js';
import socketHandlers from './socket/handlers.js';

export const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../client/dist');

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const clientUrl = process.env.CLIENT_URL;
  if (clientUrl) {
    const allowed = clientUrl.split(',').map(u => u.trim().replace(/\/$/, ''));
    if (allowed.includes(origin.replace(/\/$/, ''))) return true;
  }
  return (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('ngrok') ||
    origin.endsWith('.onrender.com') ||
    origin.endsWith('.ngrok-free.app') ||
    origin.endsWith('.ngrok-free.dev') ||
    origin.endsWith('.ngrok.io') ||
    origin.endsWith('.ngrok.app')
  );
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      // Allow all during testing/sharing so external users are not blocked
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"]
};

export const io = new Server(httpServer, { 
  cors: corsOptions 
});

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve built frontend if available
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

io.on('connection', (socket) => {
  socketHandlers(io, socket);
});

// ─── Timer 1: Auto-lock expired OPEN sessions (every 15s) ───
setInterval(async () => {
  try {
    const expiredSessions = await prisma.session.findMany({
      where: { status: 'OPEN', expiresAt: { lte: new Date() } }
    });
    
    for (const session of expiredSessions) {
      await prisma.session.update({ 
        where: { id: session.id }, 
        data: { status: 'LOCKED' } 
      });
      io.to(`session:${session.id}`).emit('session:locked', { sessionId: session.id });
      console.log(`[Auto] Session ${session.id} locked (expired)`);
    }
  } catch (err) {
    console.error('Error auto-locking sessions:', err);
  }
}, 15000);

// ─── Timer 2: Auto-kick non-contributors after paymentDeadline (every 20s) ───
setInterval(async () => {
  try {
    const expiredPayments = await prisma.session.findMany({
      where: {
        status: 'AWAITING_PAYMENT',
        paymentDeadline: { lte: new Date() }
      },
      include: {
        orderItems: true,
        contributions: true
      }
    });

    for (const session of expiredPayments) {
      const pending = session.contributions.filter(c => c.status === 'PENDING');
      const contributed = session.contributions.filter(c => c.status === 'CONTRIBUTED');

      if (pending.length === 0) continue; // shouldn't happen but safety

      const pendingUserIds = pending.map(c => c.userId);

      // If NOBODY contributed, cancel the session
      if (contributed.length === 0) {
        await prisma.session.update({
          where: { id: session.id },
          data: { status: 'CANCELLED' }
        });
        await prisma.notification.createMany({
          data: session.contributions.map(c => ({
            userId: c.userId, sessionId: session.id,
            type: 'SESSION_CANCELLED',
            message: `Phiên "${session.restaurantName}" đã bị hủy vì không ai góp tiền đúng hạn.`
          }))
        });
        io.to(`session:${session.id}`).emit('session:cancelled', { sessionId: session.id });
        console.log(`[Auto] Session ${session.id} cancelled (no contributions)`);
        continue;
      }

      // Remove non-contributors' items and contributions
      await prisma.$transaction([
        prisma.orderItem.deleteMany({
          where: { sessionId: session.id, userId: { in: pendingUserIds } }
        }),
        prisma.contribution.deleteMany({
          where: { sessionId: session.id, userId: { in: pendingUserIds } }
        })
      ]);

      // Notify kicked users
      await prisma.notification.createMany({
        data: pendingUserIds.map(userId => ({
          userId, sessionId: session.id,
          type: 'KICKED_NO_PAYMENT',
          message: `Bạn đã bị loại khỏi phiên "${session.restaurantName}" vì không góp tiền đúng hạn.`
        }))
      });

      // Recalculate bill for remaining users
      const remainingItems = await prisma.orderItem.findMany({
        where: { sessionId: session.id }
      });

      const { shippingFee, discountAmount, discountPercent, splitMethod } = session;
      
      // Recompute splits
      const userTotals = {};
      let totalItemsValue = 0;
      remainingItems.forEach(item => {
        const t = item.unitPrice * item.quantity;
        userTotals[item.userId] = (userTotals[item.userId] || 0) + t;
        totalItemsValue += t;
      });

      const participantIds = Object.keys(userTotals);
      const participantCount = participantIds.length;
      const totalDiscount = (totalItemsValue * discountPercent / 100) + discountAmount;

      const newContributions = participantIds.map(userId => {
        const subtotal = userTotals[userId];
        const shareOfDiscount = totalItemsValue > 0 ? (subtotal / totalItemsValue) * totalDiscount : 0;
        let shareOfShipping = splitMethod === 'PROPORTIONAL'
          ? (totalItemsValue > 0 ? (subtotal / totalItemsValue) * shippingFee : 0)
          : shippingFee / participantCount;
        let finalAmount = Math.ceil((subtotal - shareOfDiscount + shareOfShipping) / 500) * 500;
        if (finalAmount < 0) finalAmount = 0;

        return { sessionId: session.id, userId, amount: finalAmount, status: 'CONTRIBUTED' };
      });

      // Replace contributions
      await prisma.contribution.deleteMany({ where: { sessionId: session.id } });
      await prisma.contribution.createMany({ data: newContributions });

      // Since all remaining people already contributed, move to ORDERED
      await prisma.session.update({
        where: { id: session.id },
        data: { status: 'ORDERED' }
      });

      // Notify remaining users
      await prisma.notification.createMany({
        data: participantIds.map(userId => ({
          userId, sessionId: session.id,
          type: 'RECALCULATED',
          message: `${pendingUserIds.length} người đã bị loại khỏi phiên "${session.restaurantName}". Số tiền đã được tính lại.`
        }))
      });

      io.to(`session:${session.id}`).emit('session:recalculated', { sessionId: session.id });
      console.log(`[Auto] Session ${session.id}: kicked ${pendingUserIds.length} non-contributors, recalculated`);
    }
  } catch (err) {
    console.error('Error auto-kicking non-contributors:', err);
  }
}, 20000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
