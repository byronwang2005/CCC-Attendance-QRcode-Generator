import qr from 'qr-image';
import { buildAttendanceUrl, extractScheduleId } from '../lib/attendance.js';
import { ERROR_MESSAGES, RESPONSE_HEADERS } from '../lib/api-constants.js';
import { recordQrGeneration } from '../lib/qr-stats.js';

const jsonResponse = (payload, status) => new Response(JSON.stringify(payload), {
  status,
  headers: RESPONSE_HEADERS.json
});

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
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

    const attendanceUrl = buildAttendanceUrl({ scheduleId: sid, timestamp });

    const qrBuffer = qr.imageSync(attendanceUrl, { type: 'png', margin: 2, size: 10 });

    const statsWrite = recordQrGeneration({ env, scheduleId: sid, timestamp }).catch(() => {});
    if (context.waitUntil) {
      context.waitUntil(statsWrite);
    }

    return new Response(qrBuffer, {
      headers: RESPONSE_HEADERS.png
    });
  } catch {
    return jsonResponse({ error: ERROR_MESSAGES.serverError }, 500);
  }
}
