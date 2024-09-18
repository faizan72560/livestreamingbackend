const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const MAX_CONNECTIONS = 10000;
let connectedClients = 0;
const activeStreams = new Map();

io.on('connection', (socket) => {
  if (connectedClients >= MAX_CONNECTIONS) {
    socket.emit('error', 'Server at capacity. Please try again later.');
    socket.disconnect(true);
    return;
  }

  connectedClients++;

  socket.on('startStream', ({ offer }) => {
    const streamId = uuidv4();
    activeStreams.set(streamId, { broadcaster: socket.id, offer });
    socket.join(streamId);
    socket.emit('streamStarted', { streamId });
  });

  socket.on('joinStream', ({ streamId }) => {
    const stream = activeStreams.get(streamId);
    if (stream) {
      socket.join(streamId);
      socket.emit('offer', stream.offer);
    } else {
      socket.emit('error', 'Stream not found');
    }
  });

  socket.on('answer', ({ answer, streamId }) => {
    const stream = activeStreams.get(streamId);
    if (stream && stream.broadcaster !== socket.id) {
      io.to(stream.broadcaster).emit('answer', answer);
    }
  });

  socket.on('message', ({ streamId, message }) => {
    io.to(streamId).emit('message', message);
  });

  socket.on('disconnect', () => {
    connectedClients--;
    activeStreams.forEach((stream, streamId) => {
      if (stream.broadcaster === socket.id) {
        activeStreams.delete(streamId);
        io.to(streamId).emit('streamEnded');
      }
    });
  });
});

app.get('/health', (req, res) => {
    res.status(200).send('Application is running');
  });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});