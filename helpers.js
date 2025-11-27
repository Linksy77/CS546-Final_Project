import { ObjectId } from 'mongodb';

// String Validations

export const isValidString = (str, fieldName) => {
  if (str === undefined || str === null) {
    throw new Error(`${fieldName} must be provided`);
  }
  if (typeof str !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  str = str.trim();
  if (str.length === 0) {
    throw new Error(`${fieldName} cannot be empty or just spaces`);
  }
  return str;
};

export const isValidNonEmptyArray = (arr, fieldName) => {
  if (!arr || !Array.isArray(arr)) {
    throw new Error(`${fieldName} must be a non-empty array`);
  }
  if (arr.length === 0) {
    throw new Error(`${fieldName} must contain at least one element`);
  }
  return true;
};

export const isValidCommunityDistrict = (cd) => {
  cd = isValidString(cd, 'Community district');
  if (!/^\d{2}$/.test(cd)) {
    throw new Error('Community district must be exactly 2 digits (e.g., "01", "07", "12")');
  }
  const cdNum = parseInt(cd, 10);
  if (cdNum < 1 || cdNum > 18) {  // Max is 18 (Brooklyn)
    throw new Error('Community district must be between 01 and 18');
  }
  return cd;
};

export const isValidNumber = (num, fieldName, min = -Infinity, max = Infinity) => {
  if (num === undefined || num === null) {
    throw new Error(`${fieldName} must be provided`);
  }
  if (typeof num !== 'number' || isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  return num;
};

export const isValidObjectId = (id, fieldName) => {
  if (!id) {
    throw new Error(`${fieldName} must be provided`);
  }
  if (typeof id !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  id = id.trim();
  if (!ObjectId.isValid(id)) {
    throw new Error(`${fieldName} is not a valid ObjectId`);
  }
  return id;
};

// NYC specific validations

export const isValidBorough = (borough) => {
  const validBoroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
  borough = isValidString(borough, 'Borough');
  if (!validBoroughs.includes(borough)) {
    throw new Error(`Borough must be one of: ${validBoroughs.join(', ')}`);
  }
  return borough;
};

export const isValidZipCode = (zipCode) => {
  zipCode = isValidString(zipCode, 'Zip code');
  if (!/^\d{5}$/.test(zipCode)) {
    throw new Error('Zip code must be exactly 5 digits');
  }
  return zipCode;
};

export const isValidBlockNumber = (block) => {
  block = isValidString(block, 'Block number');
  if (!/^\d+$/.test(block)) {
    throw new Error('Block number must contain only digits');
  }
  return block;
};

//Neighborhood specific validations

export const isValidQuietScore = (score) => {
  return isValidNumber(score, 'Quiet score', 0, 10);
};

export const isValidTimeOfDay = (time) => {
  const validTimes = ['Morning', 'Afternoon', 'Evening', 'Night'];
  time = isValidString(time, 'Time of day');
  if (!validTimes.includes(time)) {
    throw new Error(`Time of day must be one of: ${validTimes.join(', ')}`);
  }
  return time;
};

export const isValidDayOfWeek = (day) => {
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  day = isValidString(day, 'Day of week');
  if (!validDays.includes(day)) {
    throw new Error(`Day of week must be one of: ${validDays.join(', ')}`);
  }
  return day;
};

//Validates Complaint Type Structure
export const validateComplaintType = (complaintType) => {
  if (!complaintType || typeof complaintType !== 'object') {
    throw new Error('Complaint type must be an object');
  }
  
  complaintType.type = isValidString(complaintType.type, 'Complaint type');
  complaintType.count = isValidNumber(complaintType.count, 'Complaint count', 0);
  complaintType.percentage = isValidNumber(complaintType.percentage, 'Complaint percentage', 0, 100);
  
  return complaintType;
};

// Converts string to ObjectId
export const toObjectId = (id) => {
  return new ObjectId(id);
};