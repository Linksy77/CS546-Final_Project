/**
 * Add Intensity Migration
 * 
 * There was a bug where average intensity was null and 
 * set to 5.0 due to its null value.
 * 
 * This script adds intensity values to all existing noise complaints
 * 
 * Run this ONCE after updating complaints.js to fix existing data.
 * 
 * Usage:
 *   npm run add-intensity
 */

import { dbConnection, closeConnection } from '../../config/mongoConnection.js';
import { noiseComplaints } from '../../config/mongoCollections.js';

const COMPLAINT_TYPE_INTENSITIES = {
  'Noise - Helicopter': 9,
  'Noise - Aircraft': 9,
  'Noise - Aircraft/Boat': 8,
  'Noise - Construction': 8,
  'Construction': 8,
  'Loud Music/Party': 7,
  'Loud Music': 7,
  'Noise - Residential': 7,
  'Noise - Commercial': 6,
  'Noise': 6,
  'Noise - House of Worship': 5,
  'Noise - Vehicle': 5,
  'Vehicle': 5,
  'Noise - Street/Sidewalk': 4,
  'Noise - Park': 4,
};

const assignIntensity = (complaintType) => {
  if (!complaintType) return 5;
  
  if (COMPLAINT_TYPE_INTENSITIES[complaintType]) {
    return COMPLAINT_TYPE_INTENSITIES[complaintType];
  }
  
  const type = complaintType.toLowerCase();
  
  if (type.includes('helicopter') || type.includes('aircraft')) return 9;
  if (type.includes('construction') || type.includes('jackhammer')) return 8;
  if (type.includes('party') || type.includes('loud music') || type.includes('bass')) return 7;
  if (type.includes('commercial') || type.includes('restaurant') || type.includes('bar')) return 6;
  if (type.includes('vehicle') || type.includes('car') || type.includes('truck') || type.includes('residential')) return 5;
  if (type.includes('dog') || type.includes('barking') || type.includes('animal')) return 4;
  if (type.includes('park') || type.includes('recreation')) return 3;
  
  return 5;
};

const main = async () => {
  console.log('  INTENSITY FIELD MIGRATION');
  
  await dbConnection();
  const complaintsCollection = await noiseComplaints();
  
  const totalBefore = await complaintsCollection.countDocuments({});
  const withIntensityBefore = await complaintsCollection.countDocuments({
    intensity: { $exists: true, $ne: null }
  });
  
  console.log('BEFORE MIGRATION:');
  console.log(`  Total complaints: ${totalBefore.toLocaleString()}`);
  console.log(`  With intensity: ${withIntensityBefore.toLocaleString()}`);
  console.log(`  Missing intensity: ${(totalBefore - withIntensityBefore).toLocaleString()}`);
  console.log(`  Coverage: ${Math.round((withIntensityBefore / totalBefore) * 100)}%\n`);
  
  const complaintsToUpdate = await complaintsCollection.find({
    $or: [
      { intensity: { $exists: false } },
      { intensity: null }
    ]
  }).toArray();
  
  if (complaintsToUpdate.length === 0) {
    console.log('No complaints need updating. All complaints already have intensity!\n');
    await closeConnection();
    return;
  }
  
  console.log(`Found ${complaintsToUpdate.length.toLocaleString()} complaints to update.\n`);
  console.log('Starting migration (this may take a moment)...\n');
  
  const intensityDistribution = {};
  let updated = 0;
  let errors = 0;
  
  const BATCH_SIZE = 1000;
  const totalBatches = Math.ceil(complaintsToUpdate.length / BATCH_SIZE);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, complaintsToUpdate.length);
    const batch = complaintsToUpdate.slice(start, end);
    
    const bulkOps = [];
    
    for (const complaint of batch) {
      try {
        const intensity = assignIntensity(complaint.complaintType);
        
        intensityDistribution[intensity] = (intensityDistribution[intensity] || 0) + 1;
        
        bulkOps.push({
          updateOne: {
            filter: { _id: complaint._id },
            update: { $set: { intensity } }
          }
        });
        
        updated++;
      } catch (error) {
        console.error(`Error processing complaint ${complaint._id}:`, error.message);
        errors++;
      }
    }
    
    if (bulkOps.length > 0) {
      try {
        await complaintsCollection.bulkWrite(bulkOps);
      } catch (error) {
        console.error(`Error executing batch ${batchIndex + 1}:`, error.message);
        errors += bulkOps.length;
        updated -= bulkOps.length;
      }
    }
    
    const progress = Math.round(((batchIndex + 1) / totalBatches) * 100);
    const processedCount = Math.min(end, complaintsToUpdate.length);
    console.log(`  Progress: ${progress}% (${processedCount.toLocaleString()}/${complaintsToUpdate.length.toLocaleString()} complaints)`);
  }
  
  console.log('\n Migration complete!\n');
  
  // Get statistics AFTER migration
  const totalAfter = await complaintsCollection.countDocuments({});
  const withIntensityAfter = await complaintsCollection.countDocuments({
    intensity: { $exists: true, $ne: null }
  });
  
  console.log('AFTER MIGRATION:');
  console.log(`  Total complaints: ${totalAfter.toLocaleString()}`);
  console.log(`  With intensity: ${withIntensityAfter.toLocaleString()}`);
  console.log(`  Missing intensity: ${(totalAfter - withIntensityAfter).toLocaleString()}`);
  console.log(`  Coverage: ${Math.round((withIntensityAfter / totalAfter) * 100)}%\n`);
  
  console.log('MIGRATION SUMMARY:');
  console.log(`   Successfully updated: ${updated.toLocaleString()}`);
  console.log(`   Errors: ${errors}\n`);
  
  console.log('INTENSITY DISTRIBUTION:');
  const sortedIntensities = Object.keys(intensityDistribution)
    .map(k => parseInt(k))
    .sort((a, b) => a - b);
  
  for (const intensity of sortedIntensities) {
    const count = intensityDistribution[intensity];
    const percentage = Math.round((count / updated) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 2));
    console.log(`  ${intensity}/10: ${count.toLocaleString().padStart(8)} (${percentage.toString().padStart(3)}%) ${bar}`);
  }
  
  console.log('\nCALCULATING AVERAGE INTENSITY...\n');
  
  const avgResult = await complaintsCollection.aggregate([
    { $match: { intensity: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: null,
        avgIntensity: { $avg: '$intensity' },
        minIntensity: { $min: '$intensity' },
        maxIntensity: { $max: '$intensity' },
        count: { $sum: 1 }
      }
    }
  ]).toArray();
  
  if (avgResult.length > 0) {
    const stats = avgResult[0];
    console.log('DATABASE-WIDE INTENSITY STATISTICS:');
    console.log(`  Average: ${stats.avgIntensity.toFixed(2)}`);
    console.log(`  Minimum: ${stats.minIntensity}`);
    console.log(`  Maximum: ${stats.maxIntensity}`);
    console.log(`  Count: ${stats.count.toLocaleString()}\n`);
  }
  
  await closeConnection();
  console.log('Database connection closed.\n');
};

main().catch(async (err) => {
  console.error('\n MIGRATION FAILED:', err);
  console.error('\nError details:', err.message);
  await closeConnection();
  process.exit(1);
});