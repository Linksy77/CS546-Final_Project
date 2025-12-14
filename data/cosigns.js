//#Here is our data structure for the user-submitted cosigns data used in Noise Complaint Detective

import { ObjectId } from 'mongodb';
import { noiseComplaints, users as usersCollection } from '../config/mongoCollections.js';
import { isValidObjectId, isValidString, toObjectId } from '../helpers.js';

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

/**
 * Toggle a cosign for a complaint and keep the user's cosignedComplaints in sync.
 * Returns the new cosign state and count.
 */
export const toggleCosign = async (complaintId, userId) => {
  complaintId = isValidObjectId(complaintId, 'Complaint ID');
  userId = isValidString(userId, 'User ID');

  const [complaintsCol, usersCol] = await Promise.all([
    noiseComplaints(),
    usersCollection()
  ]);

  const complaintObjectId = toObjectId(complaintId);
  const userObjectId = toObjectId(userId);

  const user = await usersCol.findOne({ _id: userObjectId }, { projection: { _id: 1 } });
  if (!user) throw new Error('User not found');

  const alreadyCosigned = await complaintsCol.findOne({
    _id: complaintObjectId,
    'cosigns.userId': userId
  });

  if (alreadyCosigned) {
    await complaintsCol.updateOne(
      { _id: complaintObjectId },
      {
        $pull: { cosigns: { userId } },
        $inc: { cosignCount: -1 }
      }
    );
    await usersCol.updateOne(
      { _id: userObjectId },
      { $pull: { cosignedComplaints: complaintId } }
    );
  } else {
    const timestamp = new Date();
    const updateResult = await complaintsCol.updateOne(
      { _id: complaintObjectId },
      {
        $push: { cosigns: { userId, timestamp } },
        $inc: { cosignCount: 1 }
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error('Complaint not found');
    }

    await usersCol.updateOne(
      { _id: userObjectId },
      { $addToSet: { cosignedComplaints: complaintId } }
    );
  }

  const refreshed = await complaintsCol.findOne(
    { _id: complaintObjectId },
    { projection: { cosignCount: 1 } }
  );

  const cosignCount = Math.max(0, refreshed?.cosignCount ?? 0);
  return {
    hasCosigned: !alreadyCosigned,
    cosignCount
  };
};
