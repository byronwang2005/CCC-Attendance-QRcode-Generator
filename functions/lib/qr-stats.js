import { qrStatsFontMedium, qrStatsFontRegular } from './qr-stats-fonts.js';

const STATS_BINDING_NAME = 'QR_STATS_DB';
const STATS_TABLE_NAME = 'qr_generation_events';

const pad = value => String(value).padStart(2, '0');

export const getHourBucket = (date = new Date()) => {
  const bucket = new Date(date);
  bucket.setUTCMinutes(0, 0, 0);
  return bucket.toISOString();
};

const getStatsDb = env => env?.[STATS_BINDING_NAME];

export const recordQrGeneration = async ({ env, scheduleId, timestamp }) => {
  const db = getStatsDb(env);
  if (!db) {
    return false;
  }

  const createdAt = new Date().toISOString();
  const bucketHour = getHourBucket(new Date(createdAt));

  await db
    .prepare(`
      INSERT INTO ${STATS_TABLE_NAME} (created_at, bucket_hour, schedule_id, requested_timestamp)
      VALUES (?, ?, ?, ?)
    `)
    .bind(createdAt, bucketHour, scheduleId, timestamp)
    .run();

  return true;
};

export const getHourlyQrStats = async ({ env, hours = 24 }) => {
  const db = getStatsDb(env);
  if (!db) {
    return { configured: false, rows: [] };
  }

  const safeHours = Math.min(Math.max(Number(hours) || 24, 1), 168);
  const start = new Date();
  start.setUTCHours(start.getUTCHours() - safeHours + 1, 0, 0, 0);

  const { results } = await db
    .prepare(`
      SELECT bucket_hour, COUNT(*) AS count
      FROM ${STATS_TABLE_NAME}
      WHERE bucket_hour >= ?
      GROUP BY bucket_hour
      ORDER BY bucket_hour ASC
    `)
    .bind(start.toISOString())
    .all();

  return {
    configured: true,
    rows: Array.isArray(results) ? results : []
  };
};

export const getCumulativeQrStats = async ({ env }) => {
  const db = getStatsDb(env);
  if (!db) {
    return { configured: false, rows: [] };
  }

  const { results } = await db
    .prepare(`
      SELECT substr(datetime(bucket_hour, '+8 hours'), 1, 10) AS day, COUNT(*) AS count
      FROM ${STATS_TABLE_NAME}
      GROUP BY day
      ORDER BY day ASC
    `)
    .all();

  return {
    configured: true,
    rows: Array.isArray(results) ? results : []
  };
};

const escapeXml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const formatShanghaiHour = isoValue => {
  const date = new Date(new Date(isoValue).getTime() + 8 * 60 * 60 * 1000);
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  return `${month}-${day} ${hour}:00`;
};

const buildHourlySeries = (rows, hours) => {
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  const countsByHour = new Map(rows.map(row => [row.bucket_hour, Number(row.count) || 0]));

  return Array.from({ length: hours }, (_, index) => {
    const pointDate = new Date(now);
    pointDate.setUTCHours(now.getUTCHours() - hours + 1 + index);
    const bucketHour = pointDate.toISOString();

    return {
      bucketHour,
      count: countsByHour.get(bucketHour) || 0,
      label: formatShanghaiHour(bucketHour)
    };
  });
};

const chartFontFamily = "'TsangerJinKai02'";
const chartColors = Object.freeze({
  brand: '#1B365D',
  brandFill: '#D0DCE9',
  parchment: '#f5f4ed',
  ivory: '#faf9f5',
  nearBlack: '#141413',
  stone: '#6b6a64'
});
const renderEmbeddedFonts = () => `<style>
    @font-face { font-family: 'TsangerJinKai02'; src: url(data:font/woff2;base64,${qrStatsFontRegular}) format('woff2'); font-style: normal; font-weight: 400; }
    @font-face { font-family: 'TsangerJinKai02'; src: url(data:font/woff2;base64,${qrStatsFontMedium}) format('woff2'); font-style: normal; font-weight: 500; }
    text { font-synthesis: none; }
  </style>`;
export const renderQrStatsSvg = ({ rows, configured, hours = 24 }) => {
  const width = 600;
  const height = 168;
  const padding = { top: 66, right: 24, bottom: 28, left: 24 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const series = buildHourlySeries(rows, hours);
  const maxCount = Math.max(1, ...series.map(point => point.count));
  const xStep = series.length > 1 ? plotWidth / (series.length - 1) : plotWidth;
  const yScale = value => padding.top + plotHeight - (value / maxCount) * plotHeight;
  const points = series.map((point, index) => ({
    ...point,
    x: padding.left + index * xStep,
    y: yScale(point.count)
  }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = `${path} L ${padding.left + plotWidth} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;
  const total = series.reduce((sum, point) => sum + point.count, 0);
  const peak = Math.max(...series.map(point => point.count));
  const latest = series.at(-1)?.count ?? 0;
  const statusText = configured
    ? `最近${hours}小时，UTC+8。总计${total}，峰值${peak}，最新${latest}`
    : 'D1 绑定 QR_STATS_DB 尚未配置。';
  const summaryText = configured
    ? `总计 ${total} · 峰值 ${peak} · 最新 ${latest}`
    : '统计数据库未配置';
  const xTicks = [0, series.length - 1]
    .filter((value, index, values) => values.indexOf(value) === index);
  const markerPoints = points.length ? [points.at(-1)] : [];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">CCC Attendance 二维码生成趋势</title>
  <desc id="desc">${escapeXml(statusText)}</desc>
  <defs>
    ${renderEmbeddedFonts()}
    <linearGradient id="hourlyPaper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#eef1ef"/>
      <stop offset="0.52" stop-color="${chartColors.parchment}"/>
      <stop offset="1" stop-color="#f1eee5"/>
    </linearGradient>
    <radialGradient id="hourlyBlueWash" cx="0" cy="0.5" r="0.78">
      <stop offset="0" stop-color="${chartColors.brand}" stop-opacity="0.08"/>
      <stop offset="1" stop-color="${chartColors.brand}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="hourlyGoldWash" cx="1" cy="0.35" r="0.72">
      <stop offset="0" stop-color="#a68b58" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#a68b58" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hourlyFill" x1="0" y1="${padding.top}" x2="0" y2="${padding.top + plotHeight}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${chartColors.brandFill}"/>
      <stop offset="1" stop-color="${chartColors.parchment}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#hourlyPaper)"/>
  <rect width="${width}" height="${height}" fill="url(#hourlyBlueWash)"/>
  <rect width="${width}" height="${height}" fill="url(#hourlyGoldWash)"/>
  <text x="${padding.left}" y="25" fill="${chartColors.nearBlack}" font-family="${chartFontFamily}" font-size="17" font-weight="500">二维码生成趋势</text>
  <text x="${padding.left}" y="46" fill="${chartColors.stone}" font-family="${chartFontFamily}" font-size="11">${escapeXml(`最近 ${hours} 小时 · UTC+8`)}</text>
  <text x="${width - padding.right}" y="31" text-anchor="end" fill="${chartColors.brand}" font-family="${chartFontFamily}" font-size="13" font-weight="500">${escapeXml(summaryText)}</text>
  <g fill="${chartColors.stone}" font-family="${chartFontFamily}" font-size="10">
    ${xTicks.map(index => `<text x="${points[index].x.toFixed(2)}" y="${height - 9}" text-anchor="${index === 0 ? 'start' : 'end'}">${escapeXml(points[index].label)}</text>`).join('\n    ')}
  </g>
  <path d="${areaPath}" fill="url(#hourlyFill)"/>
  <path d="${path}" fill="none" stroke="${chartColors.brand}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="${chartColors.ivory}" stroke="${chartColors.brand}" stroke-width="2">
    ${markerPoints.map(point => `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="3"><title>${escapeXml(`${point.label}：${point.count} 次`)}</title></circle>`).join('\n    ')}
  </g>
</svg>`;
};

const formatDayLabel = day => {
  const date = new Date(`${day}T00:00:00.000Z`);
  const shanghaiDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${pad(shanghaiDate.getUTCMonth() + 1)}-${pad(shanghaiDate.getUTCDate())}`;
};

const buildCumulativeSeries = rows => {
  if (!rows.length) {
    const today = new Date().toISOString().slice(0, 10);
    return [{ day: today, count: 0, label: formatDayLabel(today) }];
  }

  const countsByDay = new Map(rows.map(row => [row.day, Number(row.count) || 0]));
  const start = new Date(`${rows[0].day}T00:00:00.000Z`);
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  let runningTotal = 0;
  const series = [];

  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const day = date.toISOString().slice(0, 10);
    runningTotal += countsByDay.get(day) || 0;
    series.push({
      day,
      count: runningTotal,
      label: formatDayLabel(day)
    });
  }

  return series;
};

export const renderQrCumulativeStatsSvg = ({ rows, configured }) => {
  const width = 600;
  const height = 168;
  const padding = { top: 66, right: 24, bottom: 28, left: 24 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const series = buildCumulativeSeries(rows);
  const maxCount = Math.max(1, ...series.map(point => point.count));
  const xStep = series.length > 1 ? plotWidth / (series.length - 1) : plotWidth;
  const yScale = value => padding.top + plotHeight - (value / maxCount) * plotHeight;
  const points = series.map((point, index) => ({
    ...point,
    x: padding.left + index * xStep,
    y: yScale(point.count)
  }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = `${path} L ${points.at(-1).x.toFixed(2)} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;
  const total = series.at(-1)?.count ?? 0;
  const statusText = configured
    ? `历史累计总量：${total}`
    : 'D1 绑定 QR_STATS_DB 尚未配置。';
  const summaryText = configured ? `累计 ${total} 次` : '统计数据库未配置';
  const xTickIndexes = [0, series.length - 1]
    .filter((value, index, values) => values.indexOf(value) === index);
  const markerPoints = points.length === 1 ? points : [points[0], points.at(-1)];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">CCC Attendance 历史累计生成总量</title>
  <desc id="desc">${escapeXml(statusText)}</desc>
  <defs>
    ${renderEmbeddedFonts()}
    <linearGradient id="totalPaper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#eef1ef"/>
      <stop offset="0.52" stop-color="${chartColors.parchment}"/>
      <stop offset="1" stop-color="#f1eee5"/>
    </linearGradient>
    <radialGradient id="totalBlueWash" cx="0" cy="0.5" r="0.78">
      <stop offset="0" stop-color="${chartColors.brand}" stop-opacity="0.08"/>
      <stop offset="1" stop-color="${chartColors.brand}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="totalGoldWash" cx="1" cy="0.35" r="0.72">
      <stop offset="0" stop-color="#a68b58" stop-opacity="0.07"/>
      <stop offset="1" stop-color="#a68b58" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="totalFill" x1="0" y1="${padding.top}" x2="0" y2="${padding.top + plotHeight}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${chartColors.brandFill}"/>
      <stop offset="1" stop-color="${chartColors.parchment}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#totalPaper)"/>
  <rect width="${width}" height="${height}" fill="url(#totalBlueWash)"/>
  <rect width="${width}" height="${height}" fill="url(#totalGoldWash)"/>
  <text x="${padding.left}" y="25" fill="${chartColors.nearBlack}" font-family="${chartFontFamily}" font-size="17" font-weight="500">历史累计生成总量</text>
  <text x="${padding.left}" y="46" fill="${chartColors.stone}" font-family="${chartFontFamily}" font-size="11">自 2026-04-28 起</text>
  <text x="${width - padding.right}" y="31" text-anchor="end" fill="${chartColors.brand}" font-family="${chartFontFamily}" font-size="13" font-weight="500">${escapeXml(summaryText)}</text>
  <g fill="${chartColors.stone}" font-family="${chartFontFamily}" font-size="10">
    ${xTickIndexes.map(index => `<text x="${points[index].x.toFixed(2)}" y="${height - 9}" text-anchor="${index === 0 ? 'start' : 'end'}">${escapeXml(points[index].label)}</text>`).join('\n    ')}
  </g>
  <path d="${areaPath}" fill="url(#totalFill)"/>
  <path d="${path}" fill="none" stroke="${chartColors.brand}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="${chartColors.ivory}" stroke="${chartColors.brand}" stroke-width="2">
    ${markerPoints.map(point => `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="3"><title>${escapeXml(`${point.label}：${point.count} 次`)}</title></circle>`).join('\n    ')}
  </g>
</svg>`;
};
