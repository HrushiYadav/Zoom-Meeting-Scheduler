const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const { ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_ACCOUNT_ID } = process.env;

async function getAccessToken() {
    try {
        const response = await axios.post('https://zoom.us/oauth/token', null, {
            params: {
                grant_type: 'account_credentials',
                account_id: ZOOM_ACCOUNT_ID,
            },
            headers: {
                Authorization: `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error('Failed to get access token');
    }
}

app.post('/schedule-meeting', async (req, res) => {
    const { topic, start_time, duration, participants } = req.body;

    if (!topic || !start_time || !duration || !Array.isArray(participants) || participants.length === 0) {
        return res.status(400).json({ error: 'Invalid input: topic, start_time, duration, and an array of participants are required.' });
    }

    try {
        const accessToken = await getAccessToken();

        const meetingResponse = await axios.post(
            'https://api.zoom.us/v2/users/me/meetings',
            {
                topic,
                type: 2, // Scheduled meeting type 
                start_time,
                duration,
                settings: {
                    host_video: true,
                    participant_video: true,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const meetingId = meetingResponse.data.id;
        const meetingDetailsResponse = await axios.get(
            `https://api.zoom.us/v2/meetings/${meetingId}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        const meetingLink = meetingDetailsResponse.data.join_url;
        res.json({ meetingId, meetingLink, message: 'Meeting created successfully.' });
    } catch (error) {
        console.error('Error scheduling meeting:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
});


// Endpoint to Get Meeting Link
app.get('/get-meeting-link/:meetingId', async (req, res) => {
    const { meetingId } = req.params;

    if (!meetingId) {
        return res.status(400).json({ error: 'Meeting ID is required.' });
    }

    const accessToken = await getAccessToken();

    try {
        // Get the meeting details
        const meetingResponse = await axios.get(
            `https://api.zoom.us/v2/meetings/${meetingId}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        const meetingLink = meetingResponse.data.join_url;

        res.json({ meetingLink });
    } catch (error) {
        console.error('Error fetching meeting details:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
