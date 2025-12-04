/**
 * Recalculate Neighborhood Statistics
 * Author: Yaseen
 * 
 * This script recalculates the Quiet Score and Noise Personality
 * for all neighborhoods based on current complaint data.
 * 
 * Prerequisites:
 *   1. Run `npm run neighborhood-seed` first to create neighborhoods
 *   2. Run `npm run import-311-complaints` to load complaint data
 * 
 * Usage:
 *   npm run recalculate-stats
 * 
 * What it calculates:
 *   - Quiet Score (0-10): Based on complaint frequency, intensity, recency, and severity
 *   - Noise Personality: A human-readable description of the neighborhood's noise patterns
 *   - Peak noise times and days
 *   - Top complaint types
 */

import { dbConnection, closeConnection } from '../config/mongoConnection.js';
import { recalculateAllNeighborhoodStats, getQuietScoreDescription } from '../data/neighborhoodStats.js';

const main = async () => {
  console.log('Connecting to database...\n');
  await dbConnection();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     QUIET SCORE & NOISE PERSONALITY CALCULATOR             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('This will calculate for each neighborhood:');
  console.log('  • Quiet Score (0-10 rating)');
  console.log('  • Noise Personality (descriptive summary)');
  console.log('  • Peak noise times and days');
  console.log('  • Top complaint types\n');

  try {
    const startTime = Date.now();
    console.log('Calculating statistics...\n');
    
    const results = await recalculateAllNeighborhoodStats();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display results for each neighborhood
    console.log('════════════════════════════════════════════════════════════');
    console.log('RESULTS BY NEIGHBORHOOD');
    console.log('════════════════════════════════════════════════════════════\n');
    
    // Group by borough for cleaner output
    const byBorough = {};
    for (const n of results.neighborhoods) {
      if (!byBorough[n.borough]) byBorough[n.borough] = [];
      byBorough[n.borough].push(n);
    }

    for (const [borough, hoods] of Object.entries(byBorough).sort()) {
      console.log(`\n ${borough.toUpperCase()}`);
      console.log('─'.repeat(60));
      
      // Sort by quiet score descending
      hoods.sort((a, b) => b.quietScore - a.quietScore);
      
      for (const n of hoods) {
        const scoreBar = ' '.repeat(Math.round(n.quietScore)) + 'X'.repeat(10 - Math.round(n.quietScore));
        const description = getQuietScoreDescription(n.quietScore);
        
        console.log(`\n  ${n.name}`);
        console.log(`  Quiet Score: [${scoreBar}] ${n.quietScore}/10 (${description})`);
        console.log(`  Total Complaints: ${n.totalComplaints}`);
        console.log(`  Personality: "${n.noisePersonality}"`);
      }
    }

    // Summary
    console.log('\n\n════════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('════════════════════════════════════════════════════════════\n');
    
    console.log(`  Total neighborhoods processed: ${results.total}`);
    console.log(`  Successfully updated: ${results.updated}`);
    console.log(`  Failed: ${results.failed}`);
    console.log(`  Time taken: ${duration}s`);

    if (results.errors.length > 0) {
      console.log('\n !!!! Errors encountered:');
      results.errors.forEach((err, i) => {
        console.log(`    ${i + 1}. ${err.neighborhood}: ${err.error}`);
      });
    }

    // Find quietest and noisiest
    if (results.neighborhoods.length > 0) {
      const sorted = [...results.neighborhoods].sort((a, b) => b.quietScore - a.quietScore);
      const quietest = sorted[0];
      const noisiest = sorted[sorted.length - 1];
      
      console.log('\n HIGHLIGHTS:');
      console.log(`   Quietest: ${quietest.name} (${quietest.borough}) - Score: ${quietest.quietScore}`);
      console.log(`   Noisiest: ${noisiest.name} (${noisiest.borough}) - Score: ${noisiest.quietScore}`);
    }

    console.log('\n Recalculation complete!\n');
    
  } catch (error) {
    console.error('\n Recalculation failed:', error.message);
    console.error(error);
  }

  await closeConnection();
  console.log('Database connection closed.');
};

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await closeConnection();
  process.exit(1);
});