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
