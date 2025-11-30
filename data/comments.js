//#Here is our data structure for the user-submitted comments data used in Noise Complaint Detective

import { noiseComplaints } from '../config/mongoCollections.js';
import { isValidString } from '../helpers.js';
import { v4 as uuidv4 } from 'uuid';

export const addComment = async (complaintId, userId, username, commentText) => {

  complaintId = isValidString(complaintId, 'Complaint ID');
  userId = isValidString(userId, 'User ID');
  username = isValidString(username, 'Username');
  commentText = isValidString(commentText, 'Comment text');

  const collection = await noiseComplaints();

  const newComment = {
    _id: uuidv4(),
    userId,
    username,
    commentText,
    timestamp: new Date()
  };

  const result = await collection.updateOne(
    { _id: complaintId },
    { $push: { comments: newComment } }
  );

  if (result.modifiedCount === 0) {
    return { success: false, message: 'Complaint not found or comment not added' };
  }

  return { success: true, commentId: newComment._id };
};

export const removeComment = async (complaintId, commentId) => {
  complaintId = isValidString(complaintId, 'Complaint ID');
  commentId = isValidString(commentId, 'Comment ID');

  const collection = await noiseComplaints();

  const result = await collection.updateOne(
    { _id: complaintId },
    { $pull: { comments: { _id: commentId } } }
  );

  if (result.modifiedCount === 0) {
    return { success: false, message: 'Comment not found or could not be removed' };
  }

  return { success: true };
};

export const getComments = async (complaintId) => {
  complaintId = isValidString(complaintId, 'Complaint ID');

  const collection = await noiseComplaints();
  const complaint = await collection.findOne({ _id: complaintId });

  if (!complaint || !complaint.comments) return [];

  return complaint.comments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

export const hasUserCommented = async (complaintId, userId) => {
  complaintId = isValidString(complaintId, 'Complaint ID');
  userId = isValidString(userId, 'User ID');

  const collection = await noiseComplaints();
  const complaint = await collection.findOne({ _id: complaintId, 'comments.userId': userId });

  return !!complaint;
};
