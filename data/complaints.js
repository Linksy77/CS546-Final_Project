import { noiseComplaints } from '../config/mongoCollections.js';
import {
  isValidString,
  isValidBorough,
  isValidZipCode,
  isValidNonEmptyArray
} from '../helpers.js';

const BOROUGH_MAP = {
  MANHATTAN: 'Manhattan',
  BROOKLYN: 'Brooklyn',
  QUEENS: 'Queens',
  BRONX: 'Bronx',
  'STATEN ISLAND': 'Staten Island'
};

const TIME_OF_DAY_BUCKETS = [
  { name: 'Night', start: 22, end: 23 },
  { name: 'Night', start: 0, end: 5 },
  { name: 'Morning', start: 6, end: 11 },
  { name: 'Afternoon', start: 12, end: 17 },
  { name: 'Evening', start: 18, end: 21 }
];

const normalizeBorough = (value) => {
  if (!value) return null;
  const key = value.toUpperCase().trim();
  return BOROUGH_MAP[key] || null;
};

const bucketTimeOfDay = (date) => {
  if (!date) return null;
  const hour = date.getHours();
  const bucket = TIME_OF_DAY_BUCKETS.find(b => hour >= b.start && hour <= b.end);
  return bucket ? bucket.name : null;
};

const deriveDayOfWeek = (date) => {
  if (!date) return null;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

const cleanZip = (zip) => {
  if (!zip) return null;
  const trimmed = zip.toString().trim();
  if (/^\d{5}$/.test(trimmed)) return trimmed;
  return null;
};

const toGeoJSONPoint = (longitude, latitude) => {
  if (longitude === undefined || latitude === undefined) return null;
  const lon = Number(longitude);
  const lat = Number(latitude);
  if (Number.isNaN(lon) || Number.isNaN(lat)) return null;
  return { type: 'Point', coordinates: [lon, lat] };
};

const map311RecordToComplaint = (record) => {
  if (!record || typeof record !== 'object') return null;
  const sourceId = record.unique_key || record.complaint_number || record.cmf;
  if (!sourceId) return null;

  const created = record.created_date ? new Date(record.created_date) : null;
  const borough = normalizeBorough(record.borough);
  if (!borough) return null;

  const complaintType = (record.descriptor || record.complaint_type || '').trim();
  if (!complaintType) return null;

  const zipCode = cleanZip(record.incident_zip);
  const location = toGeoJSONPoint(record.longitude, record.latitude);

  const complaint = {
    complaintType,
    address: (record.incident_address || record.cross_street_1 || '').trim() || null,
    borough,
    block: null,
    neighborhood: null,
    zipCode,
    location,
    dateSubmitted: created || new Date(),
    timeOfDay: bucketTimeOfDay(created),
    dayOfWeek: deriveDayOfWeek(created),
    intensity: null,
    description: (record.descriptor || '').trim(),
    status: record.status || 'Open',
    source: '311',
    sourceId: sourceId.toString(),
    submittedBy: null,
    cosignCount: 0,
    cosigns: [],
    comments: []
  };

  // Minimal validation to avoid polluting DB
  complaint.complaintType = isValidString(complaint.complaintType, 'Complaint type');
  complaint.borough = isValidBorough(complaint.borough);
  if (complaint.zipCode) complaint.zipCode = isValidZipCode(complaint.zipCode);
  if (complaint.timeOfDay) complaint.timeOfDay = isValidString(complaint.timeOfDay, 'Time of day');
  if (complaint.dayOfWeek) complaint.dayOfWeek = isValidString(complaint.dayOfWeek, 'Day of week');

  return complaint;
};

export const ensureNoiseComplaintIndexes = async () => {
  const collection = await noiseComplaints();
  await Promise.all([
    collection.createIndex({ sourceId: 1 }, { unique: true }),
    collection.createIndex({ location: '2dsphere' }),
    collection.createIndex({ borough: 1, block: 1 }),
    collection.createIndex({ neighborhood: 1, dateSubmitted: -1 }),
    collection.createIndex({ complaintType: 1, dateSubmitted: -1 }),
    collection.createIndex({ zipCode: 1 }),
    collection.createIndex({ dateSubmitted: -1 }),
    collection.createIndex({ complaintType: 1 }),
    collection.createIndex({ submittedBy: 1 })
  ]);
};

export const upsert311Complaint = async (record) => {
  const complaint = map311RecordToComplaint(record);
  if (!complaint) return { inserted: false, reason: 'Invalid or incomplete record' };

  const collection = await noiseComplaints();
  const result = await collection.updateOne(
    { sourceId: complaint.sourceId },
    { $setOnInsert: { ...complaint } },
    { upsert: true }
  );

  return {
    inserted: result.upsertedCount > 0,
    sourceId: complaint.sourceId
  };
};

export const import311Complaints = async (records = []) => {
  isValidNonEmptyArray(records, '311 records');
  const summary = { processed: 0, inserted: 0, skipped: 0 };

  for (const record of records) {
    summary.processed++;
    try {
      const result = await upsert311Complaint(record);
      if (result.inserted) summary.inserted++;
      else summary.skipped++;
    } catch (e) {
      summary.skipped++;
    }
  }

  return summary;
};

export const getRecentComplaints = async (limit = 20) => {
  const collection = await noiseComplaints();
  const docs = await collection
    .find({})
    .sort({ dateSubmitted: -1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => ({
    ...doc,
    _id: doc._id.toString()
  }));
};

export const getComplaintPage = async (page = 1, limit = 25) => {
  const collection = await noiseComplaints();
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeLimit;

  const [docs, total] = await Promise.all([
    collection
      .find({})
      .sort({ dateSubmitted: -1 })
      .skip(skip)
      .limit(safeLimit)
      .toArray(),
    collection.countDocuments()
  ]);

  const complaints = docs.map((doc) => ({
    ...doc,
    _id: doc._id.toString()
  }));

  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    complaints,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages
  };
};
