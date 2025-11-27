import { dbConnection, closeConnection } from '../config/mongoConnection.js';
import { import311Complaints, ensureNoiseComplaintIndexes } from '../data/complaints.js';

const BASE_URL = 'https://data.cityofnewyork.us/resource/p5f6-bkga.json';
const PAGE_SIZE = parseInt(process.env.NYC_OPEN_DATA_LIMIT || '1000', 10);
const MAX_PAGES = parseInt(process.env.NYC_OPEN_DATA_PAGES || '1', 10); // safety cap
const NOISE_FILTER = process.env.NYC_OPEN_DATA_WHERE || "complaint_type like 'Noise%'";

const buildUrl = (offset) => {
  const params = new URLSearchParams({
    $limit: PAGE_SIZE.toString(),
    $offset: offset.toString(),
    $order: 'created_date DESC',
    $where: NOISE_FILTER
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

  while (page < MAX_PAGES) {
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

    if (records.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
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
