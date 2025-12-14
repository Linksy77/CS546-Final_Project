import { ObjectId } from "mongodb";
import { users } from '../config/mongoCollections.js';
import { noiseComplaints } from '../config/mongoCollections.js';
import { neighborhoods } from '../config/mongoCollections.js';
import bcrypt from 'bcryptjs';
import {
    isValidString,
    isValidObjectId,
    isValidBorough,
    isValidZipCode,
    isValidBlockNumber,
    isValidTimeOfDay,
    isValidDayOfWeek,
    validateComplaintType,
    toObjectId,
    isValidUsername,
    isValidEmail,
    isValidPassword,
    isValidName,
    isValidCity,
    isValidState,
    isValidRole,
    isValidComplaintType,
    isValidAddressFormat,
    isValidNeighborhood,
    isValidLocation,   // !! ADD ADDITIONAL CHECKING IN isValidLocation TO MAKE SURE LOCATION IS IN NYC
    isValidIntensity,
    isValidDescription,
    isValidStatus
  } from '../helpers.js';

/*
 * Users collection stores all registers users of app.
 * 
 * Users will be able to:
 *  - create accounts
 *  - log in
 *  - submit noise complaints
 *  - comment on complaints
 *  - cosign complaints
 * 
 * Users collection tracks user demographics for
 * noise pattern analysis and includes arrays
 * of complaint IDs the user has created,
 * commented on, and cosigned.
 */

/*
 * _id (string) - A globally unique identifier to represent the user.
 * username (string) - Unique username for the user account.
 * email (string) - User's email address for login and notifications.
 * hashedPassword (string) - Hashed password for secure authentication.
 * emailVerified (boolean) - Indicated whether the user's email address has been verified.
 * firstName (string) - User's first name.
 * lastName (string) - User's last name.
 * city (string) - City where the user resides.
 * state (string) - State abbreviation where the user resides.
 * zipCode (string) - User's zip code.
 * role (string) - User's role for permissions (user, moderator, admin).
 * createdAt (date) - Timestamp when the user account was created.
 * updatedAt (date) - Timestamp when the user account was last updated.
 * lastLogin (date) - Timestamp of the user's most recent login.
 * submittedComplaints (array) - Array of complaint IDs that the user has submitted.
 * cosignedComplaints (array) - Array of complaint IDs that the user has cosigned.
 * commentedComplaints (array) - Array of complaint IDs that the user has commented on.
 */

/*
 * Ex.)
 * {  "_id": "7b7997a2-c0d2-4f8c-b27a-6a1d4b5b6310",   
 * "username": "john_doe123", 
 * "email": "john.doe@gmail.com",
 * "hashedPassword": "$2a$08$XdvNkfdNIL8F8xsuIUeSbNOFgK0M0iV5HOskfVn7.PWncShU.O",  
 * "emailVerified": true,   
 * "firstName": "John",
 * "lastName": "Doe",   
 * "city": "New York",
 * "state": "NY",
 * "zipCode": "10001",
 * "role": "user",  
 * "createdAt": "2024-01-15T10:30:00Z",
 * "updatedAt": "2024-11-01T14:22:00Z",  
 * "lastLogin": "2024-11-03T09:15:00Z",   
 * "submittedComplaints": ["9c8a97b3-d1e3-5g9d-c38b-7b2e5c6c7421"],  
 * "cosignedComplaints": ["8b7896a1-c9c1-4f7b-b16a-5a0d3a4a5209"],  
 * "commentedComplaints": ["9c8a97b3-d1e3-5g9d-c38b-7b2e5c6c7421"]  }
 */

/**
 * Creates user (account)
 * @param {string} username 
 * @param {string} email 
 * @param {string} password 
 * @param {boolean} emailVerified 
 * @param {string} firstName 
 * @param {string} lastName 
 * @param {string} city 
 * @param {string} state 
 * @param {string} zipCode 
 * @param {string} role 
 * @returns {Object}
 */
export const createAccount = async (
    username,
    email,
    password,
    emailVerified = false, // false by default (undefined will result in false)
    firstName,
    lastName,
    city,
    state,
    zipCode,
    role
) => {
    // Getting the call date + time of the function
    // (used for createdAt, updatedAt, and lastLogin)
    let fxnCallDate = new Date();

    // Validating all inputs:
    // Ensuring username is valid (a valid string + unique + made up of valid characters):
    let allUsers = await getAllUsers();
    username = isValidUsername(username, allUsers);
    
    // Ensuring email is valid (a valid string + in valid email address format + unique):
    email = isValidEmail(email, allUsers);

    // Ensuring password is valid + strong
    // (a valid string + at least 8 characters + made up of valid characters
    // + has at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character)
    // and returning its hashed version
    let hashedPassword = isValidPassword(password);

    // Ensuring emailVerified is of proper type (boolean)
    if(typeof emailVerified != "boolean") {
        throw new Error("emailVerified must be a boolean (true/false) value!");
    }

    // Ensuring firstName is "valid"
    firstName = isValidName(firstName, "First name");

    // Ensuring lastName is "valid"
    lastName = isValidName(lastName, "Last name");

    // Ensuring city is valid
    city = isValidCity(city);

    // Ensuring state is valid
    state = isValidState(state);

    // Ensuring zipCode is valid
    zipCode = isValidZipCode(zipCode);

    // Ensuring role is valid
    role = isValidRole(role);

    const newUser = {
        username : username,
        email : email,
        hashedPassword : hashedPassword,
        emailVerified : emailVerified,
        firstName : firstName,
        lastName : lastName,
        city : city,
        state : state,
        zipCode : zipCode,
        role : role,
        createdAt : fxnCallDate,
        updatedAt : fxnCallDate,
        // lastLogin : fxnCallDate, // to be added when user logs in
        submittedComplaints : [],
        cosignedComplaints : [],
        commentedComplaints : []
    };

    const usersCollection = await users();
    const insertInfo = await usersCollection.insertOne(newUser);

    if(!insertInfo.acknowledged || !insertInfo.insertedId) {
        throw new Error("Could not add user!");
    }

    const user = await getUserById(insertInfo.insertedId.toString());

    // console.log(user);
    return user;

};

/**
 * Logs user in
 * @param {string} username 
 * @param {string} password 
 * @returns {Object}
 */
export const logIn = async (username, password) => {
    // Getting the call date + time of the function
    // (used for lastLogin)
    let fxnCallDate = new Date();
    const usersCollection = await users();

    username = isValidUsername(username);

    let expectedUser = await getUserByUsername(username);
    
    let expectedHashedPwd = expectedUser.hashedPassword;
    let passwordIsCorrect = await bcrypt.compare(password, expectedHashedPwd);

    if(!passwordIsCorrect) {
        // console.log("ERROR: Password is incorrect");
        throw new Error("Username or password is incorrect!");
    }

    const updatedInfo = await usersCollection.findOneAndUpdate(
        {username: new RegExp(`^${username}$`, "i")},
        {$set: {lastLogin : fxnCallDate}},
        {returnDocument: "after"}
    );

    if(!updatedInfo) {
        throw new Error("Could not log in successfully!");
    }

    updatedInfo._id = updatedInfo._id.toString();

    // console.log(updatedInfo);
    return updatedInfo;
    
};

/**
 * Submits a new noise complaint to noiseComplaints collection
 * and adds it to the user's array of submittedComplaints.
 * @param {string} userId 
 * @param {string} complaintType 
 * @param {string} address 
 * @param {string} borough 
 * @param {string} block 
 * @param {string} neighborhood 
 * @param {string} zipCode 
 * @param {number} longitude 
 * @param {number} latitude 
 * @param {string} timeOfDay 
 * @param {string} dayOfWeek 
 * @param {number} intensity 
 * @param {string} description 
 * @param {string} status 
 * @returns {Object}
 */
export const submitNoiseComplaint = async (
    userId,
    complaintType,
    address,
    borough,
    block,
    neighborhood,
    zipCode,
    longitude,
    latitude,
    timeOfDay,
    dayOfWeek,
    intensity,
    description,
    status
) => {
    // Getting the call date + time of the function
    // (used for dataSubmitted)
    let fxnCallDate = new Date();

    // Validating all inputs:
    // Ensuring complaintType is a valid complaint type
    complaintType = isValidComplaintType(complaintType);

    // Ensuring address is valid/includes only valid characters
    address = isValidAddressFormat(address);

    // Ensuring borough is valid
    borough = isValidBorough(borough);

    // Ensuring neighborhood is valid
    neighborhood = isValidNeighborhood(neighborhood);

    // Ensuring zipCode is valid
    zipCode = isValidZipCode(zipCode);

    const neighborhoodsCollection = await neighborhoods();
    let currNeighborhoodData = await neighborhoodsCollection.findOne({name: neighborhood});
    let validNeighborhoodZipCodes = await currNeighborhoodData.zipCodes;

    // console.log("validNeighborhoodZipCodes =");
    // console.log(validNeighborhoodZipCodes);
    // console.log("zipCode =");
    // console.log(zipCode);

    if(!(validNeighborhoodZipCodes.includes(zipCode))) {
        throw new Error("Zip code must correlate to proper neighborhood!");
    }

    // Ensuring block is valid
    block = isValidBlockNumber(block);

    let validNeighborhoodBlocks = await currNeighborhoodData.blocks;

    if(!(validNeighborhoodBlocks.includes(block))) {
        throw new Error("Block number must correlate to proper neighborhood!");
    }

    // Ensuring location is valid; returning GeoJSON Point w/ coords
    let location = isValidLocation(longitude, latitude);

    // Ensuring timeOfDay is valid
    timeOfDay = isValidTimeOfDay(timeOfDay);

    // Ensuring dayOfWeek is valid
    dayOfWeek = isValidDayOfWeek(dayOfWeek);

    // Ensuring intensity is valid
    intensity = isValidIntensity(intensity);

    // Ensuring description is valid
    description = isValidDescription(description);

    // Ensuring status is valid
    status = isValidStatus(status);

    // Ensuring userId is valid + user exists
    userId = isValidObjectId(userId);
    const userWhoSubmitted = await getUserById(userId);

    const complaintsCollection = await noiseComplaints();
    let amtOfComplaints = await complaintsCollection.countDocuments({});
    let newSourceId = `00${amtOfComplaints}`;

    // Creating new noise complaint and adding it to noiseComplaints
    const newNoiseComplaint = {
        complaintType : complaintType,
        address : address,
        borough : borough,
        block : block,
        neighborhood : neighborhood,
        zipCode : zipCode,
        location : location,
        dateSubmitted : fxnCallDate,
        timeOfDay : timeOfDay,
        dayOfWeek : dayOfWeek,
        intensity : intensity,
        description : description,
        status : status,
        source : "user",
        sourceId : newSourceId,
        submittedBy : userId,
        cosignCount : 0,
        cosigns : [],
        comments : []
    };

    const complaintInsertInfo = await complaintsCollection.insertOne(newNoiseComplaint);

    if(!complaintInsertInfo.acknowledged || !complaintInsertInfo.insertedId) {
        throw new Error("Could not add noise complaint!");
    }

    // Updating user's submittedComplaints to include ID of new complaint
    let usersSubmittedComplaints = userWhoSubmitted.submittedComplaints;
    usersSubmittedComplaints.push(complaintInsertInfo.insertedId.toString())

    // console.log("usersCubmittedComplaints (updated) =");
    // console.log(usersSubmittedComplaints);

    const usersCollection = await users();
    const updatedUser = await usersCollection.findOneAndUpdate(
        {_id: toObjectId(userId)},
        {$set: {submittedComplaints : usersSubmittedComplaints}},
        {returnDocument: "after"}
    );

    if(!updatedUser) {
        throw new Error("Could not update user's submittedComplaints successfully!");
    }

    updatedUser._id = updatedUser._id.toString();

    // console.log("updatedUser =");
    // console.log(updatedUser);

    return updatedUser;

};

/**
 * User of ID userId comments on noise complaint of ID noiseComplaintId
 * @param {string} userId
 * @param {string} noiseComplaintId 
 * @param {string} commentText 
 * @returns {Object}
 */
export const commentOnComplaint = async (userId, noiseComplaintId, commentText) => {
    // Getting the call date + time of the function
    // (used for comment timestamp)
    let fxnCallDate = new Date();
    userId = isValidObjectId(userId);
    noiseComplaintId = isValidObjectId(noiseComplaintId);

    commentText = isValidString(commentText);

    const user = await getUserById(userId);
    let username = user.username;

    const complaintsCollection = await noiseComplaints();
    const complaint = await complaintsCollection.findOne({ _id: toObjectId(noiseComplaintId) });

    if (!complaint) {
        throw new Error("No noise complaint found with that ID!");
    }

    let complaintComments = complaint.comments;

    // Generating a new ObjectId for the user's comment,
    // creating its object, and adding it to the noiseComplaint's
    // comments array
    let commentId = new ObjectId();

    const commentToBeAdded = {
        _id : commentId,
        userId : userId,
        username : username,
        commentText : commentText,
        timestamp : fxnCallDate
    };

    complaintComments.push(commentToBeAdded);

    const updatedNcInfo = await complaintsCollection.findOneAndUpdate(
        {_id: toObjectId(noiseComplaintId)},
        {$set: {comments : complaintComments}},
        {returnDocument: "after"}
    );

    if(!updatedNcInfo) {
        throw new Error("Could not update noise complaint comments!");
    }

    // If noiseComplaint's comments array was successfully updated with new comment:
    // Adding noiseComplaintId to user's commentedComplaints
    let usersComments = user.commentedComplaints;

    usersComments.push(noiseComplaintId);

    const usersCollection = await users();
    const updatedUserInfo = await usersCollection.findOneAndUpdate(
        {_id: toObjectId(userId)},
        {$set: {commentedComplaints : usersComments}},
        {returnDocument: "after"}
    );

    if(!updatedUserInfo) {
        throw new Error("Could not update user's comments!");
    }

    // Returning the newly created comment object
    return commentToBeAdded;

};

/**
 * User of ID userId cosigns noise complaint of ID noiseComplaintId
 * @param {string} userId 
 * @param {string} noiseComplaintId 
 * @returns {Object}
 */
export const cosignComplaint = async (userId, noiseComplaintId) => {
    // Getting the call date + time of the function
    // (used for cosign timestamp)
    let fxnCallDate = new Date();
    userId = isValidObjectId(userId);
    noiseComplaintId = isValidObjectId(noiseComplaintId);

    const user = await getUserById(userId);

    const complaintsCollection = await noiseComplaints();
    const complaint = await complaintsCollection.findOne({ _id: toObjectId(noiseComplaintId) });

    if (!complaint) {
        throw new Error("No noise complaint found with that ID!");
    }

    let complaintCosigns = complaint.cosigns;
    let complaintCosignCount = complaint.cosignCount;

    // Add object w/ userId and timestamp to noiseComplaint
    const cosignToBeAdded = {
        userId : userId,
        timestamp : fxnCallDate
    };

    complaintCosigns.push(cosignToBeAdded);
    complaintCosignCount++;

    const updatedNcInfo = await complaintsCollection.findOneAndUpdate(
        {_id: toObjectId(noiseComplaintId)},
        {$set: {cosignCount : complaintCosignCount,
                cosigns : complaintCosigns}},
        {returnDocument: "after"}
    );

    if(!updatedNcInfo) {
        throw new Error("Could not update noise complaint cosign count and cosigns!");
    }

    // If noiseComplaint's cosigns array and cosignCount were successfully updated with new cosign:
    // Adding noiseComplaintId to user's cosignedComplaints
    let usersCosignedComplaints = user.cosignedComplaints;

    usersCosignedComplaints.push(noiseComplaintId);

    const usersCollection = await users();
    const updatedUserInfo = await usersCollection.findOneAndUpdate(
        {_id: toObjectId(userId)},
        {$set: {cosignedComplaints : usersCosignedComplaints}},
        {returnDocument: "after"}
    );

    if(!updatedUserInfo) {
        throw new Error("Could not update user's cosignedComplaints!");
    }

    // Returning the newly created cosign object
    return cosignToBeAdded;

};


// Additional methods ----------------------------------------------------------------

/**
 * Gets all Users
 * @returns {Array}
 */
export const getAllUsers = async () => {
    const usersCollection = await users();
    const usersList = await usersCollection.find({}).toArray();

    return usersList.map(user => {
        user._id = user._id.toString();
        return user;
    });
};

/**
 * Gets user by ID
 * @param {string} id 
 * @returns {Object}
 */
export const getUserById = async (id) => {
    id = isValidObjectId(id, "User ID");

    const usersCollection = await users();
    const user = await usersCollection.findOne({ _id: toObjectId(id) });

    if (!user) {
        throw new Error("No user found with that ID!");
    }

    user._id = user._id.toString();
    return user;

};

/**
 * Gets user by username
 * @param {string} username 
 * @returns {Object}
 */
export const getUserByUsername = async (username) => {
    username = isValidUsername(username);

    const usersCollection = await users();
    const user = await usersCollection.findOne({
        username: new RegExp(`^${username}$`, "i")
    });

    if (!user) {
        // console.log("ERROR: User of that username not found");
        throw new Error("Username or password is incorrect!");
    }

    user._id = user._id.toString();
    return user;
    
};

/**
 * Deletes user by ID
 * @param {string} id 
 * @returns {Object}
 */
export const deleteUser = async (id) => {
    id = isValidObjectId(id, "User ID");

    const usersCollection = await users();
    const user = await getUserById(id);

    const deleteInfo = await usersCollection.deleteOne({ _id: toObjectId(id) });

    if (deleteInfo.deletedCount === 0) {
        throw new Error("Could not delete user!");
    }

    return {
        deleted: true,
        username: user.username,
        email: user.email
    };

};