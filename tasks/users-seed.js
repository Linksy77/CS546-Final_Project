import { dbConnection, closeConnection } from '../config/mongoConnection.js';
import * as usersData from '../data/users.js';

// Random/made up sample users:
const sampleUsers = [
    {
      username: "exampleUser1",
      email: "email_1@example.com",
      password: "just!Some!Password11",
      emailVerified: false,
      firstName: "John",
      lastName: "Smith",
      city: "Syracuse",
      state: "NY",
      zipCode: "13202",
      role: "user"
    },
    {
      username: "Example-User2",
      email: "email_2@example.com",
      password: "StrongPass_2A!",
      emailVerified: true,
      firstName: "Alice",
      lastName: "Johnson",
      city: "Los Angeles",
      state: "CA",
      zipCode: "90001",
      role: "moderator"
    },
    {
      username: "exUser_3",
      email: "email_3@example.com",
      password: "MyPass3@Word",
      emailVerified: false,
      firstName: "Robert",
      lastName: "Brown",
      city: "Chicago",
      state: "IL",
      zipCode: "60601",
      role: "user"
    },
    {
      username: "exam_User_4",
      email: "email_4@example.com",
      password: "Hello4$World",
      emailVerified: true,
      firstName: "Emily",
      lastName: "Davis",
      city: "Houston",
      state: "TX",
      zipCode: "77001",
      role: "user"
    },
    {
      username: "EXAMPLE_USER-5",
      email: "email_5@example.com",
      password: "Pass5!Word",
      emailVerified: true,
      firstName: "Michael",
      lastName: "Miller",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85001",
      role: "admin"
    },
    {
      username: "  exampleuser6 ",
      email: "email_6@example.com",
      password: "User6_Example!",
      emailVerified: false,
      firstName: "Sarah",
      lastName: "Wilson",
      city: "Philadelphia",
      state: "PA",
      zipCode: "19019",
      role: "user"
    },
    {
      username: "eXaMpLeUsEr7",
      email: "email_7@example.com",
      password: "PassWord7#A",
      emailVerified: true,
      firstName: "David",
      lastName: "Moore",
      city: "San Antonio",
      state: "TX",
      zipCode: "78201",
      role: "user"
    },
    {
      username: "example-_-user-_-8",
      email: "email_8@example.com",
      password: "Ex8_User!X",
      emailVerified: false,
      firstName: "Jessica",
      lastName: "Taylor",
      city: "San Diego",
      state: "CA",
      zipCode: "92101",
      role: "moderator"
    },
    {
      username: "EXAMPLE_-_USER_-_9",
      email: "email_9@example.com",
      password: "User9Pass#Y",
      emailVerified: true,
      firstName: "Daniel",
      lastName: "Anderson",
      city: "Dallas",
      state: "TX",
      zipCode: "75201",
      role: "user"
    },
    {
      username: "Example_x_User10",
      email: "email_10@example.com",
      password: "Ex10@UserZ",
      emailVerified: false,
      firstName: "Laura",
      lastName: "Thomas",
      city: "San Jose",
      state: "CA",
      zipCode: "95101",
      role: "user"
    },
    {
      username: "ex-user-11",
      email: "email_11@example.com",
      password: "Password11!X",
      emailVerified: true,
      firstName: "Brian",
      lastName: "Jackson",
      city: "Austin",
      state: "TX",
      zipCode: "73301",
      role: "user"
    },
    {
      username: "-_-Ex_User12-_-",
      email: "email_12@example.com",
      password: "Ex12#User!",
      emailVerified: false,
      firstName: "Megan",
      lastName: "White",
      city: "Jacksonville",
      state: "FL",
      zipCode: "32099",
      role: "moderator"
    },
    {
      username: "exUser13",
      email: "email_13@example.com",
      password: "Ex13_User@",
      emailVerified: true,
      firstName: "Kevin",
      lastName: "Harris",
      city: "Fort Worth",
      state: "TX",
      zipCode: "76101",
      role: "user"
    },
    {
      username: "exUser14",
      email: "email_14@example.com",
      password: "User14!Pass",
      emailVerified: false,
      firstName: "Amanda",
      lastName: "Martin",
      city: "Columbus",
      state: "OH",
      zipCode: "43004",
      role: "user"
    },
    {
      username: "exUser15",
      email: "email_15@example.com",
      password: "Pass15$User",
      emailVerified: true,
      firstName: "Joshua",
      lastName: "Thompson",
      city: "Charlotte",
      state: "NC",
      zipCode: "28201",
      role: "user"
    },
    {
      username: "exUser16",
      email: "email_16@example.com",
      password: "User16!Pass",
      emailVerified: false,
      firstName: "Stephanie",
      lastName: "Garcia",
      city: "San Francisco",
      state: "CA",
      zipCode: "94101",
      role: "user"
    },
    {
      username: "exUser17  ",
      email: "email_17@example.com",
      password: "Ex17@User!",
      emailVerified: true,
      firstName: "Anthony",
      lastName: "Martinez",
      city: "Indianapolis",
      state: "IN",
      zipCode: "46201",
      role: "user"
    },
    {
      username: "  exUser18",
      email: "email_18@example.com",
      password: "User18#Pass!",
      emailVerified: false,
      firstName: "Elizabeth",
      lastName: "Robinson",
      city: "Seattle",
      state: "WA",
      zipCode: "98101",
      role: "moderator"
    },
    {
      username: "exUser19",
      email: "email_19@example.com",
      password: "Ex19_User@1",
      emailVerified: true,
      firstName: "Ryan",
      lastName: "Clark",
      city: "Denver",
      state: "CO",
      zipCode: "80201",
      role: "user"
    },
    {
      username: "exUser20",
      email: "email_20@example.com",
      password: "User20!Xyz",
      emailVerified: false,
      firstName: "Olivia",
      lastName: "Rodriguez",
      city: "Hoboken",
      state: "NJ",
      zipCode: "20001",
      role: "user"
    },
    {
      username: "exUser21",
      email: "email_21@example.com",
      password: "Pass21_User!",
      emailVerified: true,
      firstName: "Alexander",
      lastName: "Lewis",
      city: "Boston",
      state: "MA",
      zipCode: "02101",
      role: "user"
    },
    {
      username: "exUser22",
      email: "email_22@example.com",
      password: "User22#Pass1",
      emailVerified: false,
      firstName: "Samantha",
      lastName: "Lee",
      city: "El Paso",
      state: "TX",
      zipCode: "79901",
      role: "user"
    },
    {
      username: "exUser23",
      email: "email_23@example.com",
      password: "Ex23!PassX",
      emailVerified: true,
      firstName: "Brandon",
      lastName: "Walker",
      city: "Detroit",
      state: "MI",
      zipCode: "48201",
      role: "moderator"
    }
  ]; 

const main = async () => {
  const db = await dbConnection();
  
  try {
    await db.dropCollection('users');
    console.log('Dropped users collection\n');
  } catch (e) {
    console.log('Users collection does not exist yet, creating it...\n');
  }

  console.log('Currently Seeding Users\n');
  console.log('These are all sample users\n');

  try {
    let createdCount = 0;

    for (const currUser of sampleUsers) {
      // Using placeholder data for now. Will use 311 Data after.
      const user = await usersData.createAccount(
        currUser.username,
        currUser.email,
        currUser.password, 
        currUser.emailVerified,
        currUser.firstName,
        currUser.lastName,
        currUser.city,
        currUser.state,
        currUser.zipCode,
        currUser.role
      );
      
      createdCount++;
      console.log(`Successfully Created: ${user.username} (${user.email})`);
    }

    console.log(`\nSuccessfully seeded ${createdCount} sample users\n`);

  } catch (e) {
    console.error('Error during seeding:');
    console.error(e);
  }

  await closeConnection();
  console.log('Database connection closed.');
};

main();