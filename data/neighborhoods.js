import { neighborhoods } from '../config/mongoCollections.js';
import {
  isValidString,
  isValidNonEmptyArray,
  isValidNumber,
  isValidObjectId,
  isValidBorough,
  isValidZipCode,
  isValidBlockNumber,
  isValidQuietScore,
  isValidTimeOfDay,
  isValidDayOfWeek,
  validateComplaintType,
  toObjectId
} from '../helpers.js';

// Field validators for recalculation and updates
const FIELD_VALIDATORS = {
  name: v => isValidString(v, 'Neighborhood name'),
  borough: v => isValidBorough(v),
  communityDistrict: v => isValidString(v, 'Community district'),
  blocks: v => { isValidNonEmptyArray(v, 'Blocks'); return v.map(b => isValidBlockNumber(b)); },
  zipCodes: v => { isValidNonEmptyArray(v, 'Zip codes'); return v.map(z => isValidZipCode(z)); },
  quietScore: v => isValidQuietScore(v),
  totalComplaints: v => isValidNumber(v, 'Total complaints', 0),
  avgIntensity: v => isValidNumber(v, 'Average intensity', 0, 10),
  noisePersonality: v => isValidString(v, 'Noise personality'),
  topComplaintTypes: v => { isValidNonEmptyArray(v, 'Top complaint types'); return v.map(t => validateComplaintType(t)); },
  peakNoiseTime: v => isValidTimeOfDay(v),
  peakNoiseDay: v => isValidDayOfWeek(v)
};

/**
 * Neighborhood Creation
 * @param {string} name 
 * @param {string} borough - (Manhattan, Brooklyn, Queens, Bronx, Staten Island)
 * @param {string} communityDistrict - Community district code
 * @param {string[]} blocks - Array of NYC block numbers
 * @param {string[]} zipCodes - Array of zip codes in the neighborhood
 * @param {number} quietScore - Calculated score (0-10) rating neighborhood quietness
 * @param {number} totalComplaints - Total number of noise complaints
 * @param {number} avgIntensity - Average noise intensity 
 * @param {string} noisePersonality - Descriptive summary of noise characteristics
 * @param {Object[]} topComplaintTypes - Array of top complaint types with counts
 * @param {string} peakNoiseTime - Time of day when complaints are most frequent
 * @param {string} peakNoiseDay - Day of week when complaints are most frequent
 * @returns {Object} The created neighborhood object
 */
export const createNeighborhood = async (
  name,
  borough,
  communityDistrict,
  blocks,
  zipCodes,
  quietScore,
  totalComplaints,
  avgIntensity,
  noisePersonality,
  topComplaintTypes,
  peakNoiseTime,
  peakNoiseDay
) => {
    // Validate all inputs
    name = isValidString(name, 'Neighborhood name');
    borough = isValidBorough(borough);
    communityDistrict = isValidString(communityDistrict, 'Community district');

    // Validate blocks array
    isValidNonEmptyArray(blocks, 'Blocks');
    blocks = blocks.map(block => isValidBlockNumber(block));
  
    // Validate zip codes array
    isValidNonEmptyArray(zipCodes, 'Zip codes');
    zipCodes = zipCodes.map(zip => isValidZipCode(zip));

    // Validate numeric fields
    quietScore = isValidQuietScore(quietScore);
    totalComplaints = isValidNumber(totalComplaints, 'Total complaints', 0);
    avgIntensity = isValidNumber(avgIntensity, 'Average intensity', 0, 10);
    
    // Validate string fields
    noisePersonality = isValidString(noisePersonality, 'Noise personality');
    peakNoiseTime = isValidTimeOfDay(peakNoiseTime);
    peakNoiseDay = isValidDayOfWeek(peakNoiseDay);

    // Validate top complaint types
    isValidNonEmptyArray(topComplaintTypes, 'Top complaint types');
    topComplaintTypes = topComplaintTypes.map(type => validateComplaintType(type));
    
    const neighborhoodsCollection = await neighborhoods();

    // Check if neighborhood already exists
    const existingNeighborhood = await neighborhoodsCollection.findOne({
      borough: borough,
      communityDistrict: communityDistrict
    });
    
    if (existingNeighborhood) {
      throw new Error(`Neighborhood in ${borough} Community District ${communityDistrict} already exists`);
    }
    
    const newNeighborhood = {
      name,
      borough,
      communityDistrict,
      blocks,
      zipCodes,
      quietScore,
      totalComplaints,
      avgIntensity,
      noisePersonality,
      topComplaintTypes,
      peakNoiseTime,
      peakNoiseDay,
      lastUpdated: new Date()
    };

    const insertInfo = await neighborhoodsCollection.insertOne(newNeighborhood);
    
    if (!insertInfo.acknowledged || !insertInfo.insertedId) {
      throw new Error('Could not add neighborhood');
    }
    
    const neighborhood = await getNeighborhoodById(insertInfo.insertedId.toString());
    return neighborhood;
};

// Neighborhood Getter Function

/**
 * Get By ID
 * @param {string} id 
 * @returns {Object} 
 */
export const getNeighborhoodById = async (id) => {
  id = isValidObjectId(id, 'Neighborhood ID');
  
  const neighborhoodsCollection = await neighborhoods();
  const neighborhood = await neighborhoodsCollection.findOne({ _id: toObjectId(id) });
  
  if (!neighborhood) {
    throw new Error('No neighborhood found with that ID');
  }
  
  neighborhood._id = neighborhood._id.toString();
  return neighborhood;
};

/**
 * Get by Community District 
 */
export const getNeighborhoodByCommunityDistrict = async (borough, communityDistrict) => {
  borough = isValidBorough(borough);
  communityDistrict = isValidString(communityDistrict, 'Community district');
  
  const neighborhoodsCollection = await neighborhoods();
  const neighborhood = await neighborhoodsCollection.findOne({
    borough: borough,
    communityDistrict: communityDistrict
  });
  
  if (!neighborhood) {
    throw new Error(
      `No neighborhood found for ${borough} Community District ${communityDistrict}`
    );
  }
  
  neighborhood._id = neighborhood._id.toString();
  return neighborhood;
};

/**
 * Get By Name and Borough
 * @param {string} name 
 * @param {string} borough 
 * @returns {Object} 
 */
export const getNeighborhoodByNameAndBorough = async (name, borough) => {
  name = isValidString(name, 'Neighborhood name');
  borough = isValidBorough(borough);
  
  const neighborhoodsCollection = await neighborhoods();
  const neighborhood = await neighborhoodsCollection.findOne({
    name: name,
    borough: borough
  });
  
  if (!neighborhood) {
    throw new Error(`No neighborhood found with name ${name} in ${borough}`);
  }
  
  neighborhood._id = neighborhood._id.toString();
  return neighborhood;
};

/**
 * Get All Neighborhoods
 * @returns {Array} 
 */
export const getAllNeighborhoods = async () => {
  const neighborhoodsCollection = await neighborhoods();
  const neighborhoodsList = await neighborhoodsCollection.find({}).toArray();
  
  return neighborhoodsList.map(neighborhood => {
    neighborhood._id = neighborhood._id.toString();
    return neighborhood;
  });
};

/**
 * Get All in a Specific Borough
 * @param {string} borough 
 * @returns {Array} 
 */
export const getNeighborhoodsByBorough = async (borough) => {
  borough = isValidBorough(borough);
  
  const neighborhoodsCollection = await neighborhoods();
  const neighborhoodsList = await neighborhoodsCollection
    .find({ borough: borough })
    .toArray();
  
  return neighborhoodsList.map(neighborhood => {
    neighborhood._id = neighborhood._id.toString();
    return neighborhood;
  });
};

/**
 * Get by Block Number
 * @param {string} blockNumber 
 * @returns {Object} 
 */
export const getNeighborhoodByBlock = async (blockNumber) => {
  blockNumber = isValidBlockNumber(blockNumber);
  
  const neighborhoodsCollection = await neighborhoods();
  const neighborhood = await neighborhoodsCollection.findOne({
    blocks: blockNumber
  });
  
  if (!neighborhood) {
    throw new Error(`No neighborhood found containing block ${blockNumber}`);
  }
  
  neighborhood._id = neighborhood._id.toString();
  return neighborhood;
};

/**
 * Get by Zip Code
 * @param {string} zipCode - The zip code
 * @returns {Array} 
 */
export const getNeighborhoodsByZipCode = async (zipCode) => {
  zipCode = isValidZipCode(zipCode);
  
  const neighborhoodsCollection = await neighborhoods();
  const neighborhoodsList = await neighborhoodsCollection
    .find({ zipCodes: zipCode })
    .toArray();
  
  if (neighborhoodsList.length === 0) {
    throw new Error(`No neighborhoods found with zip code ${zipCode}`);
  }
  
  return neighborhoodsList.map(neighborhood => {
    neighborhood._id = neighborhood._id.toString();
    return neighborhood;
  });
};

/**
 * Update Data
 * @param {string} id 
 * @param {Object} updateData - Object containing fields to update
 * @returns {Object} The updated neighborhood
 */
export const updateNeighborhood = async (id, updateData) => {
  id = isValidObjectId(id, 'Neighborhood ID');
  
  if (!updateData || typeof updateData !== 'object') {
    throw new Error('Update data must be provided as an object');
  }
  
  const updateFields = {};

  const validators = FIELD_VALIDATORS;

  // Validate and collect only recognized fields
  for (const [key, validator] of Object.entries(validators)) {
    if (updateData[key] !== undefined) {
      updateFields[key] = validator(updateData[key]);
    }
  }
  if (Object.keys(updateFields).length === 0) {
    throw new Error('At least one field must be provided to update');
  }
  
  // Always update the lastUpdated timestamp
  updateFields.lastUpdated = new Date();
  
  const neighborhoodsCollection = await neighborhoods();
  const updateInfo = await neighborhoodsCollection.findOneAndUpdate(
    { _id: toObjectId(id) },
    { $set: updateFields },
    { returnDocument: 'after' }
  );
  
  if (!updateInfo) {
    throw new Error('Could not update neighborhood');
  }
  
  updateInfo._id = updateInfo._id.toString();
  return updateInfo;
};

/**
 * Delete by ID
 * @param {string} id 
 * @returns {Object} 
 */
export const deleteNeighborhood = async (id) => {
  id = isValidObjectId(id, 'Neighborhood ID');
  
  const neighborhoodsCollection = await neighborhoods();
  const neighborhood = await getNeighborhoodById(id);
  
  const deleteInfo = await neighborhoodsCollection.deleteOne({ _id: toObjectId(id) });
  
  if (deleteInfo.deletedCount === 0) {
    throw new Error('Could not delete neighborhood');
  }
  
  return {
    deleted: true,
    neighborhoodName: neighborhood.name,
    borough: neighborhood.borough
  };
};

/**
 * Sort by Score
 * @param {string} order - ('asc' or 'desc')
 * @param {number} limit - Number of results to return
 * @returns {Array} 
 */
export const getNeighborhoodsByQuietScore = async (order = 'desc', limit = null) => {
  if (order !== 'asc' && order !== 'desc') {
    throw new Error('Order must be either "asc" or "desc"');
  }
  
  const sortOrder = order === 'asc' ? 1 : -1;
  
  const neighborhoodsCollection = await neighborhoods();
  let query = neighborhoodsCollection.find({}).sort({ quietScore: sortOrder });
  
  if (limit !== null) {
    limit = isValidNumber(limit, 'Limit', 1);
    query = query.limit(limit);
  }
  
  const neighborhoodsList = await query.toArray();
  
  return neighborhoodsList.map(neighborhood => {
    neighborhood._id = neighborhood._id.toString();
    return neighborhood;
  });
};

/**
 * Search By Name
 * @param {string} searchTerm
 * @returns {Array} 
 */
export const searchNeighborhoodsByName = async (searchTerm) => {
  searchTerm = isValidString(searchTerm, 'Search term');
  
  const neighborhoodsCollection = await neighborhoods();
  const neighborhoodsList = await neighborhoodsCollection
    .find({ name: { $regex: searchTerm, $options: 'i' } })
    .toArray();
  
  return neighborhoodsList.map(neighborhood => {
    neighborhood._id = neighborhood._id.toString();
    return neighborhood;
  });
};

/**
 * Recalculate neighborhood statistics based on complaints
 * Normally called after new complaints are added
 * @param {string} id 
 * @param {Object} stats - The new statistics to update
 * @returns {Object} 
 */
export const recalculateNeighborhoodStats = async (id, stats) => {
  id = isValidObjectId(id, 'Neighborhood ID');
  
  if (!stats || typeof stats !== 'object') {
    throw new Error('Statistics must be provided as an object');
  }
  
  const updateData = {};
  const statKeys = [
    'totalComplaints',
    'avgIntensity',
    'quietScore',
    'topComplaintTypes',
    'peakNoiseTime',
    'peakNoiseDay',
    'noisePersonality' 
  ];

  for (const key of statKeys) {
    if (stats[key] !== undefined && FIELD_VALIDATORS[key]) {
      updateData[key] = FIELD_VALIDATORS[key](stats[key]);
    }
  }

  return updateNeighborhood(id, updateData);
};