import { recalculateAllNeighborhoodStats } from './data/neighborhoodStats.js';

let bgInterval = null;  let isRunning = false;
// Updates every 5 minutes
const UPDATE_INTERVAL = 5 * 60 * 1000;


async function updateStats() {
  if (isRunning) {return;}

  isRunning = true;
  const startTime = Date.now();
  
  try {
    console.log('Starting recalculation...');
    const results = await recalculateAllNeighborhoodStats();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Complete! Updated ${results.updated} neighborhoods in ${duration}s`);
    if (results.failed > 0) {
      console.warn(`${results.failed} neighborhoods failed to update`);
    }
  } catch (error) {
    console.error('Error during stats update:', error.message);
  } finally {
    isRunning = false;
  }
}


export function startsBackStats() {
  if (bgInterval) {
    console.log('Already running, not starting again');
    return;
  }

  console.log(`Will update every ${UPDATE_INTERVAL / 60000} minutes`);
  updateStats();
  bgInterval = setInterval(updateStats, UPDATE_INTERVAL);
}

export function stopBackStats() {
  if (bgInterval) {
    clearInterval(bgInterval);
    bgInterval = null;
    console.log('Stopped');
  }
}

export function getStatus() {
  return {
    running: bgInterval !== null,
    updateInProgress: isRunning,
    updateInterval: UPDATE_INTERVAL
  };
}

process.on('SIGINT', () => {
  stopBackStats();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopBackStats();
  process.exit(0);
});