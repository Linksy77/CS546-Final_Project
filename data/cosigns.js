//#Here is our data structure for the user-submitted cosigns data used in Noise Complaint Detective

import { noiseComplaints } from '../config/mongoCollections.js';
import { isValidObjectId, isValidString } from '../helpers.js';

export const addCosign = async (complaintId, userId) => {
  isValidObjectId(complaintId, 'Complaint ID');
  userId = isValidString(userId, 'User ID');

  const collection = await noiseComplaints();

  const existing = await collection.findOne({
    _id: new ObjectId(complaintId),
    'cosigns.userId': userId
  });

  if (existing) {
    return { success: false, message: 'User has already cosigned this complaint.' };
  }

  const timestamp = new Date();

  const result = await collection.updateOne(
    { _id: new ObjectId(complaintId) },
    {
      $push: { cosigns: { userId, timestamp } },
      $inc: { cosignCount: 1 }
    }
  );

  if (result.modifiedCount === 0) {
    return { success: false, message: 'Complaint not found or cosign not added.' };
  }

  return { success: true, userId, timestamp };
};

export const removeCosign = async (complaintId, userId) => {
  isValidObjectId(complaintId, 'Complaint ID');
  userId = isValidString(userId, 'User ID');

  const collection = await noiseComplaints();

  const result = await collection.updateOne(
    { _id: new ObjectId(complaintId) },
    {
      $pull: { cosigns: { userId } },
      $inc: { cosignCount: -1 }
    }
  );

  if (result.modifiedCount === 0) {
    return { success: false, message: 'Cosign not found or complaint does not exist.' };
  }

  return { success: true, userId };
};

export const getCosigns = async (complaintId) => {
  isValidObjectId(complaintId, 'Complaint ID');

  const collection = await noiseComplaints();
  const complaint = await collection.findOne(
    { _id: new ObjectId(complaintId) },
    { projection: { cosigns: 1 } }
  );

  if (!complaint) throw new Error('Complaint not found');

  return complaint.cosigns || [];
};

export const hasUserCosigned = async (complaintId, userId) => {
  isValidObjectId(complaintId, 'Complaint ID');
  userId = isValidString(userId, 'User ID');

  const collection = await noiseComplaints();
  const complaint = await collection.findOne({
    _id: new ObjectId(complaintId),
    'cosigns.userId': userId
  });

  return !!complaint;
};
