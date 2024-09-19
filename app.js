require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Generate Zoom JWT Token
function generateZoomToken() {
  const payload = {
    iss: "IyVCvQWZTXGCbNuoIk1eaQ",
    exp: Math.floor(Date.now() / 1000) + 60 * 60 // Token expires in 1 hour
  };

  return jwt.sign(payload, "M3OrocRsXDqsNbwISdJEMXDKPcE0834J");
}

// Create a Zoom Meeting
async function createMeeting() {
  const token = generateZoomToken();
  const zoomUser = "faizanahmad72560@gmail.com";

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

    console.log('Meeting created successfully:', response.data);
  } catch (error) {
    console.error('Error creating Zoom meeting:', error.response ? error.response.data : error.message);
  }
}

createMeeting();
