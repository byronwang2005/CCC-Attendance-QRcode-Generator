import { RESPONSE_HEADERS } from '../lib/api-constants.js';
import { getCumulativeQrStats, renderQrCumulativeStatsSvg } from '../lib/qr-stats.js';

export async function onRequestGet(context) {
  try {
    const stats = await getCumulativeQrStats({ env: context.env });
    const svg = renderQrCumulativeStatsSvg(stats);

    return new Response(svg, {
      headers: RESPONSE_HEADERS.svg
    });
  } catch {
    const svg = renderQrCumulativeStatsSvg({ configured: true, rows: [] });

    return new Response(svg, {
      status: 500,
      headers: RESPONSE_HEADERS.svg
    });
  }
}
