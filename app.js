const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors'); // Import cors
const jwt = require('jsonwebtoken');
const axios=require("axios")

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const MAX_CONNECTIONS = 10000;
let connectedClients = 0;
const activeStreams = new Map();

// Enable CORS for all routes
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true // If you need to send cookies or auth headers
}));

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

const apiKey = 'IyVCvQWZTXGCbNuoIk1eaQ'; // Replace with your actual API Key
const apiSecret = 'M3OrocRsXDqsNbwISdJEMXDKPcE0834J'; // Replace with your actual API Secret

app.get('/generate-token', (req, res) => {
  const payload = {
    iss: apiKey,
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // Token expires in 1 hour
  };

  try {
    const token = jwt.sign(payload, apiSecret);
    console.log(token);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate token' });
  }
});


function generateZoomToken() {
  const payload = {
    iss: "IyVCvQWZTXGCbNuoIk1eaQ",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 // Token expires in 1 hour
  };

  return jwt.sign(payload, "M3OrocRsXDqsNbwISdJEMXDKPcE0834J");
}


app.get('/create-meeting', async (req, res) => {
  const token = generateZoomToken();
  const zoomUser = "faizanahmad72560@gmail.com";
  console.log(token)

  try {
    const response = await axios.post(
      `https://api.zoom.us/v2/users/${zoomUser}/meetings`,
      {
        topic: "New Meeting",
        type: 1, // Instant meeting type
        settings: {
          host_video: true,
          participant_video: true
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data,
    });

    console.log('Meeting created successfully:', response.data);
  } catch (error) {
    console.error('Error creating Zoom meeting:', error.response ? error.response.data : error.message);

    // Send error response to the client
    res.status(500).json({
      success: false,
      message: error.response ? error.response.data : error.message,
    });
  }
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
