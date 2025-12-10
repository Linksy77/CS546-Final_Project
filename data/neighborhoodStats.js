import { noiseComplaints, neighborhoods } from '../config/mongoCollections.js';
import { isValidObjectId, 
         isValidBorough, 
         isValidZipCode, 
         toObjectId, 
         getRandomElement, 
         formatComplaintType, 
         generateComparisonSummary
    } from '../helpers.js';

// Weights for Quiet Score calculation (must sum to 1.0)
const QUIET_SCORE_WEIGHTS = {
  frequency: 0.40,    // How many complaints per capita/area
  intensity: 0.35,    // Average reported intensity
  recency: 0.15,      // How recent complaints are
  severity: 0.10      // Types of complaints (some are worse than others)
};

// Complaint type severity ratings (1 = mild, 5 = severe)
const COMPLAINT_SEVERITY = {
  'Noise': 2,
  'Noise - Residential': 3,
  'Noise - Commercial': 3,
  'Noise - Street/Sidewalk': 2,
  'Noise - Vehicle': 2,
  'Noise - Aircraft/Boat': 2,
  'Noise - Construction': 4,
  'Noise - Park': 1,
  'Loud Music/Party': 3,
  'Construction': 4,
  'Vehicle': 2,
  'Barking Dog': 2
};

// Time of day descriptors for personality
const TIME_DESCRIPTORS = {
  'Morning': 'early riser disturbances',
  'Afternoon': 'daytime activity',
  'Evening': 'evening liveliness',
  'Night': 'late-night noise'
};

// Day of week patterns
const DAY_PATTERNS = {
  weekend: ['Friday', 'Saturday', 'Sunday'],
  weekday: ['Monday', 'Tuesday', 'Wednesday', 'Thursday']
};

// Personality templates based on patterns
const PERSONALITY_TEMPLATES = {
  veryQuiet: [
    'A peaceful sanctuary with minimal noise disturbances',
    'One of the quietest areas in the borough',
    'Remarkably tranquil for an urban neighborhood'
  ],
  quiet: [
    'Generally peaceful with occasional disturbances',
    'A calm neighborhood with typical city sounds',
    'Mostly quiet with some expected urban noise'
  ],
  moderate: [
    'A lively neighborhood with moderate noise levels',
    'Balanced mix of activity and quiet periods',
    'Typical urban soundscape with predictable patterns'
  ],
  noisy: [
    'An energetic area with frequent noise activity',
    'Vibrant and bustling with regular sound disturbances',
    'Expect regular noise throughout the day and night'
  ],
  veryNoisy: [
    'One of the most active areas for noise complaints',
    'High-energy neighborhood with frequent disturbances',
    'Not recommended for noise-sensitive residents'
  ]
};


/**
 * Aggregates complaint statistics for a specific neighborhood
 * @param {string} neighborhoodName 
 * @param {string} borough 
 * @returns {Object} 
 */
export const aggregateNeighborhoodComplaints = async (neighborhoodName, borough) => {
  const complaintsCollection = await noiseComplaints();
  
  // Build query - match by neighborhood name or by borough + zip codes
  const neighborhoodsCollection = await neighborhoods();
  const neighborhood = await neighborhoodsCollection.findOne({
    name: neighborhoodName,
    borough: borough
  });

  if (!neighborhood) {
    throw new Error(`Neighborhood ${neighborhoodName} in ${borough} not found`);
  }

  // Query complaints by zip codes in this neighborhood
  const zipCodes = neighborhood.zipCodes || [];
  
  const pipeline = [
    {
      $match: {
        $or: [
          { neighborhood: neighborhoodName },
          { zipCode: { $in: zipCodes } }
        ]
      }
    },
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        
        avgIntensity: [
          { $match: { intensity: { $ne: null, $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$intensity' } } }
        ],
        
        byType: [
          { $group: { _id: '$complaintType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        
        byTimeOfDay: [
          { $match: { timeOfDay: { $ne: null } } },
          { $group: { _id: '$timeOfDay', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        
        byDayOfWeek: [
          { $match: { dayOfWeek: { $ne: null } } },
          { $group: { _id: '$dayOfWeek', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        
        recentCount: [
          {
            $match: {
              dateSubmitted: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              }
            }
          },
          { $count: 'count' }
        ],
        
        byMonth: [
          {
            $group: {
              _id: {
                year: { $year: '$dateSubmitted' },
                month: { $month: '$dateSubmitted' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 12 }
        ]
      }
    }
  ];

  const results = await complaintsCollection.aggregate(pipeline).toArray();
  const data = results[0];

  return {
    neighborhoodId: neighborhood._id.toString(),
    neighborhoodName,
    borough,
    totalComplaints: data.totalCount[0]?.count || 0,
    avgIntensity: data.avgIntensity[0]?.avg || 5.0,
    byType: data.byType || [],
    byTimeOfDay: data.byTimeOfDay || [],
    byDayOfWeek: data.byDayOfWeek || [],
    recentCount: data.recentCount[0]?.count || 0,
    byMonth: data.byMonth || [],
    zipCodes
  };
};

/**
 * Aggregates complaint statistics by borough
 * @param {string} borough 
 * @returns {Object} 
 */
export const aggregateBoroughComplaints = async (borough) => {
  borough = isValidBorough(borough);
  const complaintsCollection = await noiseComplaints();

  const pipeline = [
    { $match: { borough: borough } },
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        avgIntensity: [
          { $match: { intensity: { $ne: null } } },
          { $group: { _id: null, avg: { $avg: '$intensity' } } }
        ],
        byZipCode: [
          { $group: { _id: '$zipCode', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]
      }
    }
  ];

  const results = await complaintsCollection.aggregate(pipeline).toArray();
  const data = results[0];

  return {
    borough,
    totalComplaints: data.totalCount[0]?.count || 0,
    avgIntensity: data.avgIntensity[0]?.avg || 5.0,
    byZipCode: data.byZipCode || []
  };
};

/**
 * Aggregates complaints by zip code
 * @param {string} zipCode 
 * @returns {Object} 
 */
export const aggregateByZipCode = async (zipCode) => {
  zipCode = isValidZipCode(zipCode);
  const complaintsCollection = await noiseComplaints();

  const pipeline = [
    { $match: { zipCode: zipCode } },
    {
      $facet: {
        totalCount: [{ $count: 'count' }],
        avgIntensity: [
          { $match: { intensity: { $ne: null } } },
          { $group: { _id: null, avg: { $avg: '$intensity' } } }
        ],
        byType: [
          { $group: { _id: '$complaintType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        byTimeOfDay: [
          { $match: { timeOfDay: { $ne: null } } },
          { $group: { _id: '$timeOfDay', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        byDayOfWeek: [
          { $match: { dayOfWeek: { $ne: null } } },
          { $group: { _id: '$dayOfWeek', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]
      }
    }
  ];

  const results = await complaintsCollection.aggregate(pipeline).toArray();
  const data = results[0];

  return {
    zipCode,
    totalComplaints: data.totalCount[0]?.count || 0,
    avgIntensity: data.avgIntensity[0]?.avg || 5.0,
    byType: data.byType || [],
    byTimeOfDay: data.byTimeOfDay || [],
    byDayOfWeek: data.byDayOfWeek || []
  };
};


/**
 * Calculates the Quiet Score for a neighborhood
 * 
 * The Quiet Score is a 0-10 rating where:
 * - 10 = Very quiet (few complaints, low intensity)
 * - 0 = Very noisy (many complaints, high intensity)
 * 
 * @param {Object} stats - Aggregated statistics 
 * @param {Object} boroughStats - Borough-wide statistics for comparison
 * @returns {number} Quiet Score (0-10, rounded to 1 decimal)
 */
export const calculateQuietScore = (stats, boroughStats = null) => {
  // If no complaints, assume very quiet
  if (!stats.totalComplaints || stats.totalComplaints === 0) {
    return 10.0;
  }

  // 1. FREQUENCY SCORE (40% weight)
  // Compare neighborhood complaints to borough average
  let frequencyScore;
  if (boroughStats && boroughStats.byZipCode && boroughStats.byZipCode.length > 0) {
    const avgComplaintsPerZip = boroughStats.totalComplaints / boroughStats.byZipCode.length;
    const neighborhoodAvg = stats.totalComplaints / Math.max(1, stats.zipCodes.length);
    
    // If neighborhood has fewer complaints than average, higher score
    const ratio = neighborhoodAvg / Math.max(1, avgComplaintsPerZip);
    frequencyScore = Math.max(0, Math.min(10, 10 - (ratio * 5)));
  } else {
    // Without borough comparison, use absolute thresholds
    // Using 100 as a rough temporary threshold
    const threshold = 100;
    frequencyScore = Math.max(0, Math.min(10, 10 - (stats.totalComplaints / threshold) * 5));
  }

  // 2. INTENSITY SCORE (35% weight)
  // Average intensity is 1-10, invert for quiet score
  const avgIntensity = stats.avgIntensity || 5;
  const intensityScore = Math.max(0, Math.min(10, 11 - avgIntensity));

  // 3. RECENCY SCORE (15% weight)
  // More recent complaints = lower score
  const recentRatio = stats.totalComplaints > 0 
    ? stats.recentCount / stats.totalComplaints 
    : 0;
  const recencyScore = Math.max(0, Math.min(10, 10 - (recentRatio * 10)));

  // 4. SEVERITY SCORE (10% weight)
  // Calculate weighted severity based on complaint types
  let weightedSeverity = 0;
  let totalTypeCount = 0;
  
  for (const typeData of stats.byType) {
    const severity = COMPLAINT_SEVERITY[typeData._id] || 2;
    weightedSeverity += severity * typeData.count;
    totalTypeCount += typeData.count;
  }
  
  const avgSeverity = totalTypeCount > 0 ? weightedSeverity / totalTypeCount : 2;
  const severityScore = Math.max(0, Math.min(10, 12 - (avgSeverity * 2)));

  // Calculate weighted final score
  const quietScore = 
    (frequencyScore * QUIET_SCORE_WEIGHTS.frequency) +
    (intensityScore * QUIET_SCORE_WEIGHTS.intensity) +
    (recencyScore * QUIET_SCORE_WEIGHTS.recency) +
    (severityScore * QUIET_SCORE_WEIGHTS.severity);

  return Math.round(quietScore * 10) / 10;
};

/**
 * Gets a text description of the Quiet Score
 * @param {number} score 
 * @returns {string} Description
 */
export const getQuietScoreDescription = (score) => {
  if (score >= 9.0) return 'Exceptionally Quiet';
  if (score >= 7.5) return 'Very Quiet';
  if (score >= 6.0) return 'Moderately Quiet';
  if (score >= 5.0) return 'Average';
  if (score >= 3.0) return 'Somewhat Noisy';
  if (score >= 2.0) return 'Noisy';
  return 'Very Noisy';
};

/**
 * Gets a color indicator for the Quiet Score (for UI display)
 * @param {number} score 
 * @returns {string} CSS color class or hex color
 */
export const getQuietScoreColor = (score) => {
  if (score >= 7.0) return '#22c55e'; // Green
  if (score >= 5.0) return '#eab308'; // Yellow
  if (score >= 3.0) return '#f97316'; // Orange
  return '#ef4444'; // Red
};

/**
 * Generates a Noise Personality description for a neighborhood
 * 
 * The Noise Personality is a human-readable summary that describes:
 * - Overall noise level
 * - Primary noise sources
 * - When noise is most common
 * - Weekly patterns
 * 
 * @param {Object} stats 
 * @param {number} quietScore 
 * @returns {string} Noise Personality description
 */
export const generateNoisePersonality = (stats, quietScore) => {
  const parts = [];

  // 1. Overall assessment based on quiet score
  let overallAssessment;
  if (quietScore >= 8.0) {
    overallAssessment = getRandomElement(PERSONALITY_TEMPLATES.veryQuiet);
  } else if (quietScore >= 6.5) {
    overallAssessment = getRandomElement(PERSONALITY_TEMPLATES.quiet);
  } else if (quietScore >= 4.5) {
    overallAssessment = getRandomElement(PERSONALITY_TEMPLATES.moderate);
  } else if (quietScore >= 2.5) {
    overallAssessment = getRandomElement(PERSONALITY_TEMPLATES.noisy);
  } else {
    overallAssessment = getRandomElement(PERSONALITY_TEMPLATES.veryNoisy);
  }
  parts.push(overallAssessment);

  // 2. Primary noise sources
  if (stats.byType && stats.byType.length > 0) {
    const topTypes = stats.byType.slice(0, 3);
    const typeNames = topTypes.map(t => formatComplaintType(t._id));
    
    if (typeNames.length === 1) {
      parts.push(`Primary noise source: ${typeNames[0]}`);
    } else if (typeNames.length === 2) {
      parts.push(`Main noise sources: ${typeNames[0]} and ${typeNames[1]}`);
    } else {
      parts.push(`Top noise sources: ${typeNames[0]}, ${typeNames[1]}, and ${typeNames[2]}`);
    }
  }

  // 3. Peak times
  if (stats.byTimeOfDay && stats.byTimeOfDay.length > 0) {
    const peakTime = stats.byTimeOfDay[0]._id;
    const descriptor = TIME_DESCRIPTORS[peakTime] || 'activity';
    parts.push(`Peak complaints during ${peakTime.toLowerCase()} hours (${descriptor})`);
  }

  // 4. Weekly patterns
  if (stats.byDayOfWeek && stats.byDayOfWeek.length > 0) {
    const topDays = stats.byDayOfWeek.slice(0, 2).map(d => d._id);
    const weekendDays = topDays.filter(d => DAY_PATTERNS.weekend.includes(d));
    const weekdayDays = topDays.filter(d => DAY_PATTERNS.weekday.includes(d));
    
    if (weekendDays.length >= weekdayDays.length && weekendDays.length > 0) {
      parts.push('Noisiest on weekends');
    } else if (weekdayDays.length > 0) {
      parts.push('More complaints during weekdays');
    }
  }

  return parts.join('. ') + '.';
};

/**
 * Generates a short personality tag (for quick display)
 * @param {Object} stats 
 * @param {number} quietScore 
 * @returns {string} Short personality tag
 */
export const generatePersonalityTag = (stats, quietScore) => {
  const tags = [];

  // Quiet level
  if (quietScore >= 7.0) {
    tags.push('Peaceful');
  } else if (quietScore >= 4.5) {
    tags.push('Lively');
  } else {
    tags.push('Bustling');
  }

  // Time pattern
  if (stats.byTimeOfDay && stats.byTimeOfDay.length > 0) {
    const peakTime = stats.byTimeOfDay[0]._id;
    if (peakTime === 'Night') {
      tags.push('Nightlife');
    } else if (peakTime === 'Morning') {
      tags.push('Early Activity');
    }
  }

  // Day pattern
  if (stats.byDayOfWeek && stats.byDayOfWeek.length > 0) {
    const topDay = stats.byDayOfWeek[0]._id;
    if (DAY_PATTERNS.weekend.includes(topDay)) {
      tags.push('Weekend Noise');
    }
  }

  // Top complaint type
  if (stats.byType && stats.byType.length > 0) {
    const topType = stats.byType[0]._id;
    if (topType.includes('Construction')) {
      tags.push('Construction Zone');
    } else if (topType.includes('Party') || topType.includes('Music')) {
      tags.push('Party Scene');
    } else if (topType.includes('Vehicle')) {
      tags.push('Traffic Noise');
    }
  }

  return tags.slice(0, 3).join(' • ');
};

/**
 * Calculates and updates all statistics for a neighborhood
 * @param {string} neighborhoodId 
 * @returns {Object} Updated neighborhood 
 */
export const calculateNeighborhoodStats = async (neighborhoodId) => {
  neighborhoodId = isValidObjectId(neighborhoodId, 'Neighborhood ID');
  
  const neighborhoodsCollection = await neighborhoods();
  const neighborhood = await neighborhoodsCollection.findOne({ 
    _id: toObjectId(neighborhoodId) 
  });

  if (!neighborhood) {
    throw new Error('Neighborhood not found');
  }

  const stats = await aggregateNeighborhoodComplaints(
    neighborhood.name, 
    neighborhood.borough
  );

  const boroughStats = await aggregateBoroughComplaints(neighborhood.borough);

  const quietScore = calculateQuietScore(stats, boroughStats);

  const noisePersonality = generateNoisePersonality(stats, quietScore);

  const topComplaintTypes = stats.byType.slice(0, 5).map((type, index, arr) => {
    const totalInTop = arr.reduce((sum, t) => sum + t.count, 0);
    return {
      type: type._id,
      count: type.count,
      percentage: Math.round((type.count / totalInTop) * 100 * 10) / 10
    };
  });

  const peakNoiseTime = stats.byTimeOfDay[0]?._id || 'Night';
  const peakNoiseDay = stats.byDayOfWeek[0]?._id || 'Saturday';

  // Update the neighborhood document
  const updateData = {
    quietScore,
    totalComplaints: stats.totalComplaints,
    avgIntensity: Math.round(stats.avgIntensity * 10) / 10,
    noisePersonality,
    topComplaintTypes,
    peakNoiseTime,
    peakNoiseDay,
    lastUpdated: new Date()
  };

  const updatedNeighborhood = await neighborhoodsCollection.findOneAndUpdate(
    { _id: toObjectId(neighborhoodId) },
    { $set: updateData },
    { returnDocument: 'after' }
  );

  if (!updatedNeighborhood) {
    throw new Error('Failed to update neighborhood statistics');
  }

  updatedNeighborhood._id = updatedNeighborhood._id.toString();
  return updatedNeighborhood;
};

/**
 * Recalculates statistics for all neighborhoods
 * @returns {Object} Summary of updates
 */
export const recalculateAllNeighborhoodStats = async () => {
  const neighborhoodsCollection = await neighborhoods();
  const allNeighborhoods = await neighborhoodsCollection.find({}).toArray();

  const results = {
    total: allNeighborhoods.length,
    updated: 0,
    failed: 0,
    errors: [],
    neighborhoods: []
  };

  for (const neighborhood of allNeighborhoods) {
    try {
      const updatedNeighborhood = await calculateNeighborhoodStats(neighborhood._id.toString());
      results.updated++;
      results.neighborhoods.push(updatedNeighborhood);  
    } catch (error) {
      results.failed++;
      results.errors.push({
        neighborhood: neighborhood.name,
        error: error.message
      });
    }
  }

  return results;
};

/**
 * Gets neighborhood profile with all calculated statistics
 * @param {string} neighborhoodId
 * @returns {Object} Complete neighborhood profile
 */
export const getNeighborhoodProfile = async (neighborhoodId) => {
  neighborhoodId = isValidObjectId(neighborhoodId, 'Neighborhood ID');
  
  const neighborhoodsCollection = await neighborhoods();
  const neighborhood = await neighborhoodsCollection.findOne({ 
    _id: toObjectId(neighborhoodId) 
  });

  if (!neighborhood) {
    throw new Error('Neighborhood not found');
  }

  const stats = await aggregateNeighborhoodComplaints(
    neighborhood.name, 
    neighborhood.borough
  );

  return {
    ...neighborhood,
    _id: neighborhood._id.toString(),
    stats: {
      recentComplaints: stats.recentCount,
      monthlyTrend: stats.byMonth,
      complaintBreakdown: stats.byType,
      timeDistribution: stats.byTimeOfDay,
      dayDistribution: stats.byDayOfWeek
    },
    quietScoreDescription: getQuietScoreDescription(neighborhood.quietScore),
    quietScoreColor: getQuietScoreColor(neighborhood.quietScore),
    personalityTag: generatePersonalityTag(stats, neighborhood.quietScore)
  };
};

/**
 * Compare two neighborhoods side by side
 * @param {string} neighborhoodId1 - First neighborhood ID
 * @param {string} neighborhoodId2 - Second neighborhood ID
 * @returns {Object} Comparison data
 */
export const compareNeighborhoods = async (neighborhoodId1, neighborhoodId2) => {
  const [profile1, profile2] = await Promise.all([
    getNeighborhoodProfile(neighborhoodId1),
    getNeighborhoodProfile(neighborhoodId2)
  ]);

  const quieterNeighborhood = profile1.quietScore >= profile2.quietScore 
    ? profile1.name 
    : profile2.name;

  const scoreDifference = Math.abs(profile1.quietScore - profile2.quietScore);

  return {
    neighborhood1: profile1,
    neighborhood2: profile2,
    comparison: {
      quieterNeighborhood,
      scoreDifference: Math.round(scoreDifference * 10) / 10,
      summary: generateComparisonSummary(profile1, profile2)
    }
  };
};

export default {
  aggregateNeighborhoodComplaints,
  aggregateBoroughComplaints,
  aggregateByZipCode,
  calculateQuietScore,
  getQuietScoreDescription,
  getQuietScoreColor,
  generateNoisePersonality,
  generatePersonalityTag,
  calculateNeighborhoodStats,
  recalculateAllNeighborhoodStats,
  getNeighborhoodProfile,
  compareNeighborhoods
};