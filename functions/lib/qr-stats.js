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

const chartFontFamily = "'TsangerJinKai02', 'Source Han Serif SC', 'Noto Serif CJK SC', 'Songti SC', 'STSong', Georgia, serif";
const chartColors = Object.freeze({
  brand: '#1B365D',
  brandFill: '#D0DCE9',
  parchment: '#f5f4ed',
  ivory: '#faf9f5',
  nearBlack: '#141413',
  olive: '#504e49',
  stone: '#6b6a64',
  border: '#e8e6dc',
  borderSoft: '#e5e3d8'
});
// Keep the SVG self-contained: GitHub's image proxy does not load external
// resources referenced from an SVG, even when those resources are reachable.
const smallLogoHref = 'data:image/png;base64,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';
const renderSmallLogo = () => `<image href="${smallLogoHref}" xlink:href="${smallLogoHref}" x="14" y="11" width="24" height="21" preserveAspectRatio="xMidYMid meet"/>`;

export const renderQrStatsSvg = ({ rows, configured, hours = 24 }) => {
  const width = 520;
  const height = 228;
  const padding = { top: 64, right: 24, bottom: 40, left: 42 };
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
  const yTicks = [0, Math.ceil(maxCount / 2), maxCount];
  const xTicks = [0, Math.floor((series.length - 1) / 2), series.length - 1]
    .filter((value, index, values) => values.indexOf(value) === index);
  const markerPoints = points.filter(point => point.count > 0);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">CCC Attendance 二维码生成趋势</title>
  <desc id="desc">${escapeXml(statusText)}</desc>
  <defs>
    <linearGradient id="hourlyFill" x1="0" y1="${padding.top}" x2="0" y2="${padding.top + plotHeight}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${chartColors.brandFill}"/>
      <stop offset="1" stop-color="${chartColors.parchment}"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="${chartColors.ivory}" stroke="${chartColors.border}"/>
  ${renderSmallLogo()}
  <text x="${padding.left}" y="25" fill="${chartColors.nearBlack}" font-family="${chartFontFamily}" font-size="16" font-weight="500">二维码生成趋势</text>
  <text x="${padding.left}" y="45" fill="${chartColors.stone}" font-family="${chartFontFamily}" font-size="11">${escapeXml(`最近 ${hours} 小时 · UTC+8`)}</text>
  <text x="${width - padding.right}" y="34" text-anchor="end" fill="${chartColors.brand}" font-family="${chartFontFamily}" font-size="12" font-weight="500">${escapeXml(summaryText)}</text>
  <g stroke="${chartColors.borderSoft}" stroke-width="1">
    ${yTicks.map(tick => `<line x1="${padding.left}" y1="${yScale(tick).toFixed(2)}" x2="${padding.left + plotWidth}" y2="${yScale(tick).toFixed(2)}"/>`).join('\n    ')}
  </g>
  <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}" stroke="${chartColors.border}" stroke-width="1"/>
  <line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${padding.left + plotWidth}" y2="${padding.top + plotHeight}" stroke="${chartColors.border}" stroke-width="1"/>
  <g fill="${chartColors.stone}" font-family="${chartFontFamily}" font-size="10">
    ${yTicks.map(tick => `<text x="${padding.left - 10}" y="${(yScale(tick) + 4).toFixed(2)}" text-anchor="end">${tick}</text>`).join('\n    ')}
    ${xTicks.map(index => `<text x="${points[index].x.toFixed(2)}" y="${height - 18}" text-anchor="${index === 0 ? 'start' : index === series.length - 1 ? 'end' : 'middle'}">${escapeXml(points[index].label)}</text>`).join('\n    ')}
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
  const width = 520;
  const height = 228;
  const padding = { top: 64, right: 24, bottom: 40, left: 42 };
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
  const yTicks = [0, Math.ceil(maxCount / 2), maxCount];
  const xTickIndexes = [0, Math.floor((series.length - 1) / 2), series.length - 1]
    .filter((value, index, values) => values.indexOf(value) === index);
  const markerPoints = points.filter((point, index) => index === 0 || index === points.length - 1 || (series.length <= 18 && point.count > 0));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">CCC Attendance 历史累计生成总量</title>
  <desc id="desc">${escapeXml(statusText)}</desc>
  <defs>
    <linearGradient id="totalFill" x1="0" y1="${padding.top}" x2="0" y2="${padding.top + plotHeight}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${chartColors.brandFill}"/>
      <stop offset="1" stop-color="${chartColors.parchment}"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="${chartColors.ivory}" stroke="${chartColors.border}"/>
  ${renderSmallLogo()}
  <text x="${padding.left}" y="25" fill="${chartColors.nearBlack}" font-family="${chartFontFamily}" font-size="16" font-weight="500">历史累计生成总量</text>
  <text x="${padding.left}" y="45" fill="${chartColors.stone}" font-family="${chartFontFamily}" font-size="11">自 2026-04-28 起</text>
  <text x="${width - padding.right}" y="34" text-anchor="end" fill="${chartColors.brand}" font-family="${chartFontFamily}" font-size="12" font-weight="500">${escapeXml(summaryText)}</text>
  <g stroke="${chartColors.borderSoft}" stroke-width="1">
    ${yTicks.map(tick => `<line x1="${padding.left}" y1="${yScale(tick).toFixed(2)}" x2="${padding.left + plotWidth}" y2="${yScale(tick).toFixed(2)}"/>`).join('\n    ')}
  </g>
  <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotHeight}" stroke="${chartColors.border}" stroke-width="1"/>
  <line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${padding.left + plotWidth}" y2="${padding.top + plotHeight}" stroke="${chartColors.border}" stroke-width="1"/>
  <g fill="${chartColors.stone}" font-family="${chartFontFamily}" font-size="10">
    ${yTicks.map(tick => `<text x="${padding.left - 10}" y="${(yScale(tick) + 4).toFixed(2)}" text-anchor="end">${tick}</text>`).join('\n    ')}
    ${xTickIndexes.map(index => `<text x="${points[index].x.toFixed(2)}" y="${height - 18}" text-anchor="${index === 0 ? 'start' : index === series.length - 1 ? 'end' : 'middle'}">${escapeXml(points[index].label)}</text>`).join('\n    ')}
  </g>
  <path d="${areaPath}" fill="url(#totalFill)"/>
  <path d="${path}" fill="none" stroke="${chartColors.brand}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="${chartColors.ivory}" stroke="${chartColors.brand}" stroke-width="2">
    ${markerPoints.map(point => `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="3"><title>${escapeXml(`${point.label}：${point.count} 次`)}</title></circle>`).join('\n    ')}
  </g>
</svg>`;
};
