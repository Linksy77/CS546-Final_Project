import { dbConnection, closeConnection } from '../config/mongoConnection.js';
import { import311Complaints, ensureNoiseComplaintIndexes } from '../data/complaints.js';

const BASE_URL = 'https://data.cityofnewyork.us/resource/p5f6-bkga.json';
const PAGE_SIZE = parseInt(process.env.NYC_OPEN_DATA_LIMIT || '50000', 10);
const MAX_PAGES = parseInt(process.env.NYC_OPEN_DATA_PAGES || '0', 10); // 0 means no cap

const YEAR = process.env.NYC_OPEN_DATA_YEAR || '2025';
const START_DATE = process.env.NYC_OPEN_DATA_START || `${YEAR}-01-01T00:00:00`;
const END_DATE = process.env.NYC_OPEN_DATA_END || `${YEAR}-12-31T23:59:59`;

const buildWhere = () => {
  return [`created_date between '${START_DATE}' and '${END_DATE}'`].join(' AND ');
};

const buildUrl = (offset) => {
  const params = new URLSearchParams({
    $limit: PAGE_SIZE.toString(),
    $offset: offset.toString(),
    $order: 'created_date DESC',
    $where: buildWhere()
  });

  if (process.env.NYC_OPEN_DATA_APP_TOKEN) {
    params.append('$$app_token', process.env.NYC_OPEN_DATA_APP_TOKEN);
  }

  return `${BASE_URL}?${params.toString()}`;
};

const fetchPage = async (offset) => {
  const url = buildUrl(offset);
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed (${res.status}): ${text}`);
  }
  return res.json();
};

const main = async () => {
  await dbConnection();
  await ensureNoiseComplaintIndexes();

  let offset = 0;
  let page = 0;
  const totals = { processed: 0, inserted: 0, skipped: 0 };

  while (true) {
    page++;
    console.log(`Fetching page ${page} (offset ${offset})...`);

    const records = await fetchPage(offset);
    if (!records || records.length === 0) {
      console.log('No more records returned; stopping.');
      break;
    }

    const summary = await import311Complaints(records);
    totals.processed += summary.processed;
    totals.inserted += summary.inserted;
    totals.skipped += summary.skipped;

    console.log(`Page ${page}: processed ${summary.processed}, inserted ${summary.inserted}, skipped ${summary.skipped}`);

    if (MAX_PAGES > 0 && page >= MAX_PAGES) {
      console.log(`Reached MAX_PAGES (${MAX_PAGES}); stopping early.`);
      break;
    }

    offset += records.length;
  }

  console.log('Import complete.');
  console.log(`Totals -> processed: ${totals.processed}, inserted: ${totals.inserted}, skipped: ${totals.skipped}`);
  await closeConnection();
};

main().catch(async (err) => {
  console.error('Import failed:', err);
  await closeConnection();
  process.exit(1);
});
