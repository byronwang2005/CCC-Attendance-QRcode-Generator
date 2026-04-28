import { RESPONSE_HEADERS } from '../lib/api-constants.js';
import { getHourlyQrStats, renderQrStatsSvg } from '../lib/qr-stats.js';

const getHoursParam = request => {
  const url = new URL(request.url);
  const hours = Number(url.searchParams.get('hours') || 24);

  return Math.min(Math.max(Number.isFinite(hours) ? Math.floor(hours) : 24, 1), 168);
};

export async function onRequestGet(context) {
  const hours = getHoursParam(context.request);

  try {
    const stats = await getHourlyQrStats({ env: context.env, hours });
    const svg = renderQrStatsSvg({ ...stats, hours });

    return new Response(svg, {
      headers: RESPONSE_HEADERS.svg
    });
  } catch {
    const svg = renderQrStatsSvg({ configured: true, rows: [], hours });

    return new Response(svg, {
      status: 500,
      headers: RESPONSE_HEADERS.svg
    });
  }
}
