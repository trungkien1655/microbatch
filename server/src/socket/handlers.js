export default function socketHandlers(io, socket) {
  socket.on('authenticate', (data) => {
    if (data && data.userId) {
      socket.userId = data.userId;
      socket.join(`user:${data.userId}`);
    }
  });

  socket.on('space:join', (spaceId) => {
    socket.join(`space:${spaceId}`);
  });

  socket.on('session:join', (sessionId) => {
    socket.join(`session:${sessionId}`);
  });

  socket.on('session:leave', (sessionId) => {
    socket.leave(`session:${sessionId}`);
  });
  
  socket.on('disconnect', () => {
    // handled automatically by socket.io
  });
}
