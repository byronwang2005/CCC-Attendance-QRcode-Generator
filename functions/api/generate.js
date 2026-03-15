import qr from 'qr-image';
import { CCC, ERROR_MESSAGES, RESPONSE_HEADERS, SCHEDULE_ID_PATTERNS } from './constants.js';

const jsonResponse = (payload, status) => new Response(JSON.stringify(payload), {
  status,
  headers: RESPONSE_HEADERS.json
});

const extractScheduleId = (inputUrl) => {
  for (const pattern of SCHEDULE_ID_PATTERNS) {
    const match = inputUrl.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

export async function onRequestPost(context) {
  try {
    const { request } = context;
    const formData = await request.json();
    const { url, timestamp } = formData;

    if (!url) {
      return jsonResponse({ error: ERROR_MESSAGES.missingCourseUrl }, 400);
    }

    if (!timestamp) {
      return jsonResponse({ error: ERROR_MESSAGES.missingTimestamp }, 400);
    }

    const sid = extractScheduleId(url);
    if (!sid) {
      return jsonResponse({ error: ERROR_MESSAGES.invalidScheduleId }, 400);
    }

    const attendanceUrl = `${CCC.attendanceBaseUrl}?scheduleId=${sid}&time=${timestamp}`;

    const qrBuffer = qr.imageSync(attendanceUrl, { type: 'png', margin: 2, size: 10 });

    return new Response(qrBuffer, {
      headers: RESPONSE_HEADERS.png
    });
  } catch {
    return jsonResponse({ error: ERROR_MESSAGES.serverError }, 500);
  }
}
