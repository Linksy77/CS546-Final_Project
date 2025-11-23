import { dbConnection } from './mongoConnection.js';

const getCollectionFn = (collection) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }

    return _col;
  };
};

// Export collection getters
export const users = getCollectionFn('users');
export const noiseComplaints = getCollectionFn('noiseComplaints');
export const neighborhoods = getCollectionFn('neighborhoods');