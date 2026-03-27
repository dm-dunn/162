const axios = require('axios');
const logger = require('../config/logger');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a single Expo push notification.
 * Silently no-ops if the token is missing or invalid — notification
 * failures must never crash the calling request.
 */
async function sendPushNotification({ to, title, body, data = {} }) {
    if (!to || !String(to).startsWith('ExponentPushToken[')) {
        logger.debug('Skipping push — missing or invalid Expo token', { to });
        return null;
    }

    try {
        const message = {
            to,
            title,
            body,
            data,
            sound: 'default',
            priority: 'high',
        };

        const response = await axios.post(EXPO_PUSH_URL, message, {
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            timeout: 5000,
        });

        const ticket = response.data?.data;
        if (ticket?.status === 'error') {
            logger.warn('Expo push ticket error', { ticket, to });
        } else {
            logger.info('Push notification dispatched', { to, title });
        }
        return ticket;
    } catch (err) {
        logger.error('Failed to send push notification', { error: err.message, to });
        return null;
    }
}

/**
 * Notify a league owner that a new member just joined their league.
 */
async function notifyLeagueJoin({ ownerPushToken, joinerUsername, leagueName, leagueId }) {
    return sendPushNotification({
        to: ownerPushToken,
        title: '⚾ New Member Joined!',
        body: `${joinerUsername} just joined your league "${leagueName}"`,
        data: { type: 'league_join', leagueId },
    });
}

module.exports = { sendPushNotification, notifyLeagueJoin };
