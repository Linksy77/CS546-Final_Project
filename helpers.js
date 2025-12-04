import { ObjectId } from 'mongodb';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// String Validations

export const isValidString = (str, fieldName) => {
  if (str === undefined || str === null) {
    throw new Error(`${fieldName} must be provided`);
  }
  if (typeof str !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  str = str.trim();
  if (str.length === 0) {
    throw new Error(`${fieldName} cannot be empty or just spaces`);
  }
  return str;
};

export const isValidNonEmptyArray = (arr, fieldName) => {
  if (!arr || !Array.isArray(arr)) {
    throw new Error(`${fieldName} must be a non-empty array`);
  }
  if (arr.length === 0) {
    throw new Error(`${fieldName} must contain at least one element`);
  }
  return true;
};

export const isValidCommunityDistrict = (cd) => {
  cd = isValidString(cd, 'Community district');
  if (!/^\d{2}$/.test(cd)) {
    throw new Error('Community district must be exactly 2 digits (e.g., "01", "07", "12")');
  }
  const cdNum = parseInt(cd, 10);
  if (cdNum < 1 || cdNum > 18) {  // Max is 18 (Brooklyn)
    throw new Error('Community district must be between 01 and 18');
  }
  return cd;
};

export const isValidNumber = (num, fieldName, min = -Infinity, max = Infinity) => {
  if (num === undefined || num === null) {
    throw new Error(`${fieldName} must be provided`);
  }
  if (typeof num !== 'number' || isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (num < min || num > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  return num;
};

export const isValidObjectId = (id, fieldName) => {
  if (!id) {
    throw new Error(`${fieldName} must be provided`);
  }
  if (typeof id !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  id = id.trim();
  if (!ObjectId.isValid(id)) {
    throw new Error(`${fieldName} is not a valid ObjectId`);
  }
  return id;
};

// NYC specific validations

export const isValidBorough = (borough) => {
  const validBoroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
  borough = isValidString(borough, 'Borough');
  if (!validBoroughs.includes(borough)) {
    throw new Error(`Borough must be one of: ${validBoroughs.join(', ')}`);
  }
  return borough;
};

export const isValidZipCode = (zipCode) => {
  zipCode = isValidString(zipCode, 'Zip code');
  if (!/^\d{5}$/.test(zipCode)) {
    throw new Error('Zip code must be exactly 5 digits');
  }
  return zipCode;
};

export const isValidBlockNumber = (block) => {
  block = isValidString(block, 'Block number');
  if (!/^\d+$/.test(block)) {
    throw new Error('Block number must contain only digits');
  }
  return block;
};

//Neighborhood specific validations

export const isValidQuietScore = (score) => {
  return isValidNumber(score, 'Quiet score', 0, 10);
};

export const isValidTimeOfDay = (time) => {
  const validTimes = ['Morning', 'Afternoon', 'Evening', 'Night'];
  time = isValidString(time, 'Time of day');
  if (!validTimes.includes(time)) {
    throw new Error(`Time of day must be one of: ${validTimes.join(', ')}`);
  }
  return time;
};

export const isValidDayOfWeek = (day) => {
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  day = isValidString(day, 'Day of week');
  if (!validDays.includes(day)) {
    throw new Error(`Day of week must be one of: ${validDays.join(', ')}`);
  }
  return day;
};

//Validates Complaint Type Structure
export const validateComplaintType = (complaintType) => {
  if (!complaintType || typeof complaintType !== 'object') {
    throw new Error('Complaint type must be an object');
  }
  
  complaintType.type = isValidString(complaintType.type, 'Complaint type');
  complaintType.count = isValidNumber(complaintType.count, 'Complaint count', 0);
  complaintType.percentage = isValidNumber(complaintType.percentage, 'Complaint percentage', 0, 100);
  
  return complaintType;
};

// Converts string to ObjectId
export const toObjectId = (id) => {
  return new ObjectId(id);
};

// User-specific validations

export const isValidUsername = (username, allUsersList = undefined) => {
  // Checking if username is a valid string; if not, throwing an error (in isValidString)
  username = isValidString(username, "Username");

  if(allUsersList !== undefined) {
    // Checking if username is unique; if not, throwing an error:
    for (let user of allUsersList) {
      if(user.username == username) {
        throw new Error("Username is already taken!");
      }
    }
  }

  // Checking if username contains only letters, numbers, underscores, and dashes:
  if(!(/^[A-Za-z0-9_-]+$/.test(username))) {
    throw new Error("Username must only contain letters, numbers, underscores, and dashes!");
  }

  return username;

};

export const isValidEmail = (email, allUsersList) => {
  // Checking if email is a valid string; if not, throwing an error (in isValidString)
  email = isValidString(email, "Email");

  // Checking if email is unique; if not, throwing an error:
  for (let user of allUsersList) {
    if(user.email == email) {
      throw new Error("Email is already taken!");
    }
  }

  // Checking if email is in valid email address format; if not, throwing an error:
  let emailSchema = z.string().email({message: "Email address is invalid"});

  try {
    emailSchema.parse(email);
  } catch (e) {
    throw new Error("email_address must be a valid email address in a valid email address format");
  }

  return email;

};

export const isValidPassword = (password) => {
  // Checking if password is a valid string; if not, throwing an error (in isValidString)
  password = isValidString(password, "Password");

  // Checking if password:
  // - is at least 8 characters long
  // - is made up of valid characters
  // - has at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character
  let allowedCharsRegex = /^[A-Za-z0-9_\-!?@#$*]+$/;
  let complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[_\-!?@#$*]).{8,}$/;

  if (!(allowedCharsRegex.test(password))) {
    throw new Error("Password must only contain letters, numbers, and the special characters: _ - ! ? @ # $ *");
  }

  if (!(complexityRegex.test(password))) {
    throw new Error("Password must be at least 8 characters long and include one lowercase letter, uppercase letter, number, and special character!");
  }

  // Hashing password using bcryptjs and returning hashedPassword
  let salt = bcrypt.genSaltSync(10);
  let hashedPassword = bcrypt.hashSync(password, salt);

  return hashedPassword;

};

export const isValidName = (name) => {
  // Checking if name is a valid string; if not, throwing an error (in isValidString)
  name = isValidString(name, "Name");

  // Checking if name is composed of only "valid" characters
  // (in this case: lowercase latin letters + uppercase latin letters + hyphens)
  for (let currChar of name) {
    let currCharValue = currChar.charCodeAt(0);
    if((currCharValue < 65 && currCharValue != 45) || (currCharValue > 90 && currCharValue < 97)
        || (currCharValue > 122 && currCharValue < 192) || (currCharValue == 215) || (currCharValue == 247)
        || (currCharValue == 329) || (currCharValue > 383)) {
      throw new Error("Name must only contain hyphens, latin letters, and European latin letters!");
    }
  }

  return name;

};

export const isValidCity = (city) => {
  // Checking if city is a valid string; if not, throwing an error (in isValidString)
  city = isValidString(city, "City");

  // Checking if city is composed only of valid characters
  // (lowercase latin letters, uppercase latin letters, hyphens, and spaces)
  if(!(/^[A-Za-z -]+$/.test(city))) {
    throw new Error("City must only contain lowercase and uppercase latin letters, hyphens, and spaces!");
  }

  return city;

};

export const isValidState = (state) => {
  // Checking if state is a valid string; if not, throwing an error (in isValidString)
  state = isValidString(state, "State");

  // Checking if state is a valid U.S. state; if not, throwing an error
  let allUSstates = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
                     'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
                     'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
                     'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
                     'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
  if(!(allUSstates.includes(state))) {
    throw new Error("State must be a valid U.S. state!");
  }

  return state;

};

export const isValidRole = (role) => {
  // Checking if role is a valid string; if not, throwing an error (in isValidString)
  role = isValidString(role, "Role");

  // Checking if role is a valid role; if not, throwing an error
  if(role !== "user" && role !== "moderator" && role !== "admin") {
    throw new Error("Role must be a valid role (user, moderator, or admin)!");
  }

  return role;

};

export const isValidComplaintType = (complaintType) => {
  // Checking if complaintType is a valid string; if not, throwing an error (in isValidString)
  complaintType = isValidString(complaintType, "Complaint type");

  // Checking if complaintType is a valid complaint type; if not, throwing an error
  let validComplaintTypes = ['Noise','Noise - Residential','Noise - Commercial','Noise - Street/Sidewalk',
                             'Noise - Vehicle','Noise - Aircraft/Boat','Noise - Construction','Noise - Park'];
  if(!(validComplaintTypes.includes(complaintType))) {
    throw new Error("Complaint type must be a valid complaint type!");
  }

  return complaintType;
  
};

export const isValidAddressFormat = (address) => {
  // Checking if address is a valid string; if not, throwing an error (in isValidString)
  address = isValidString(address, "Address");

  // Checking if address is in valid format/consists of only valid characters
  // (i.e. letters, numbers, spaces, commas, periods, apostrophes, hyphens)
  // If not, throwing an error
  if (!(/^[a-zA-Z0-9\s,.'-]+$/.test(address))) {
    throw new Error("Address must include only valid characters!");
  }

  return address;

};

export const isValidNeighborhood = (neighborhood) => {
  // Checking if neighborhood is a valid string; if not, throwing an error (in isValidString)
  neighborhood = isValidString(neighborhood, "Neighborhood");

  // Checking if neighborhood is a valid/existing neighborhood in NYC
  // If not, throwing an error
  let validNeighborhoods = [ // Manhattan neighborhoods
                            'Upper Manhattan','Marble Hill','Inwood','Fort George','Washington Heights',
                            'Hudson Heights','West Harlem','Hamilton Heights','Manhattanville','Morningside Heights',
                            'Central Harlem','Harlem','St. Nicholas Historic District','Astor Row','Sugar Hill',
                            'Mount Morris Historical District','Le Petit Senegal','East Harlem','Upper East Side',
                            'Lenox Hill','Carnegie Hill','Yorkville','Upper West Side','Manhattan Valley','Lincoln Square',
                            'Columbus Circle','Sutton Place','Rockefeller Center','Diamond District','Theater District',
                            'Turtle Bay','Midtown East','Midtown','Tudor City','Little Brazil','Times Square','Hudson Yards',
                            'Midtown West',"Hell's Kitchen",'Garment District','Herald Square','Koreatown','Murray Hill',
                            'Tenderloin','Madison Square','Flower District','Brookdale','Kips Bay','Rose Hill','NoMad',
                            'Peter Cooper Village','Chelsea','Flatiron District','Gramercy Park','Stuyvesant Square',
                            'Union Square','Stuyvesant Town','Meatpacking District','Waterside Plaza','Lower Manhattan',
                            'Little Germany','Alphabet City','East Village','Greenwich Village','NoHo','Bowery','West Village',
                            'Lower East Side','SoHo','Nolita','Little Australia','Little Italy','Chinatown','Financial District',
                            'Five Points','Cooperative Village','Two Bridges','Tribeca','Civic Center','Radio Row','South Street Seaport',
                            'Battery Park City','Hudson Square','Little Syria',
                            // Brooklyn neighborhoods
                            'Crown Heights','Weeksville','Flatbush','Beverley Squares','Ditmas Park','East Flatbush','Farragut',
                            'Remsen Village','Fiske Terrace','Pigtown','Wingate','Prospect Lefferts Gardens','Prospect Park South',
                            'Windsor Terrace','Kensington','Brownsville','Canarsie','East New York','Spring Creek','Bedford–Stuyvesant',
                            'Bushwick','Greenpoint','Williamsburg','East Williamsburg','Brooklyn Heights','Brooklyn Navy Yard',
                            'Clinton Hill','Downtown Brooklyn','DUMBO','Fulton Ferry','Fort Greene','Prospect Heights','Vinegar Hill',
                            'South Brooklyn','Boerum Hill','Carroll Gardens','Columbia Street Waterfront District','Cobble Hill','Gowanus',
                            'Park Slope','Greenwood Heights','Red Hook','Barren Island','Bergen Beach','Georgetown','Coney Island',
                            'Brighton Beach','Manhattan Beach','Sea Gate','Sheepshead Bay','Homecrest','Midwood','Flatlands','Gerritsen Beach',
                            'Gravesend','Marine Park','Mill Basin','Plumb Beach','Bay Ridge','Bensonhurst','Bath Beach','Borough Park','Mapleton',
                            'Dyker Heights','Sunset Park',
                            // Queen neighborhoods
                            'Astoria','Long Island City','Blissville','Hunters Point','Sunnyside','Woodside','Willets Point','The Hole',
                            'Howard Beach','Ramblersville','Ozone Park','South Ozone Park','Richmond Hill','Woodhaven','Briarwood','Corona',
                            'East Elmhurst','Elmhurst','Forest Hills','Fresh Pond','Glendale','Jackson Heights','Kew Gardens','Maspeth',
                            'Middle Village','Rego Park','Ridgewood','Bayside','Bay Terrace','Bellerose','College Point','Douglaston–Little Neck',
                            'Flushing','Willets Point','Pomonok','Floral Park','Auburndale','Kew Gardens Hills','Fresh Meadows','Glen Oaks',
                            'Whitestone','Beechhurst','Bellaire','Brookville','Cambria Heights','Hollis','Holliswood','Jamaica','Jamaica Estates',
                            'Jamaica Hills','South Jamaica','St. Albans','Laurelton','Queens Village','Rosedale','Meadowmere','Springfield Gardens',
                            'Arverne','Bayswater','Belle Harbor','Breezy Point','Broad Channel','Edgemere','Far Rockaway','Neponsit','Rockaway Beach',
                            'Rockaway Park','Roxbury','Seaside',
                            // Bronx neighborhoods 
                            'Bedford Park','Belmont','Fordham','Jerome Park','Kingsbridge','Kingsbridge Heights','Van Cortlandt Village','Norwood',
                            'Riverdale','Fieldston','Spuyten Duyvil','University Heights','Woodlawn Heights','Bathgate','Claremont','Concourse',
                            'East Tremont','Highbridge','Hunts Point','Longwood','Melrose','Morris Heights','Morrisania','Crotona Park East',
                            'Mott Haven','Port Morris','The Hub','Tremont','West Farms','Allerton','Baychester','Bronxdale','City Island','Eastchester',
                            'Pelham Gardens','Pelham Parkway','Wakefield','Williamsbridge','Castle Hill','Clason Point','Country Club','Morris Park',
                            'Parkchester','Pelham Bay','Soundview','Schuylerville','Throggs Neck','Van Nest','Westchester Square',
                            // Staten Island neighborhoods
                            'Annadale','Arlington','Arrochar','Bay Terrace','Bloomfield','Brighton Heights','Bulls Head','Castleton Corners','Charleston',
                            'Chelsea','Clifton','Concord','Dongan Hills','Egbertville','Eltingville','Emerson Hill','Graniteville','Grant City','Grasmere',
                            'Great Kills','Grymes Hill','Huguenot','Lighthouse Hill','Livingston','Manor Heights','Jefferson','Mariners Harbor','Meiers Corners',
                            'Midland Beach','New Brighton','New Dorp','New Springville','Oakwood','Old Place','Old Town','Pleasant Plains','Port Ivory',
                            'Port Richmond',"Prince's Bay",'Randall Manor','Richmond Valley','Richmondtown','Rosebank','Rossville','Saint George','Shore Acres',
                            'Silver Lake','South Beach','Stapleton','Stapleton Heights','Sunnyside','Todt Hill','Tompkinsville','Tottenville','Travis',
                            'Ward Hill','West New Brighton','Westerleigh','Willowbrook','Woodrow'];
  if(!(validNeighborhoods.includes(neighborhood))) {
    throw new Error("Neighborhood must be a valid neighborhood!");
  }

  return neighborhood;

};

export const isValidLocation = (longitude, latitude) => {
  // Checking if longitude and latitude are valid numbers; if not, throwing an error (in isValidNumber)
  longitude = isValidNumber(longitude, "Longitude");
  latitude = isValidNumber(latitude, "Latitude");

  // Maybe add more validation?
  // !! FIGURE OUT HOW TO CHECK THAT LONG+LAT ARE WITHIN NYC

  // Returning longitude + latitude as a GeoJSON Point
  return { type : "Point",
           coordinates : [longitude, latitude] };
};

export const isValidIntensity = (intensity) => {
  return isValidNumber(intensity, "Intensity", 1, 10);
};

export const isValidDescription = (description) => {
  // Checking if description is a valid string; if not, throwing an error (in isValidString)
  description = isValidString(description, "Description");

  // Checking if description consists of only valid characters
  // (i.e. letters, numbers, spaces, commas, periods, apostrophes, hyphens)
  // If not, throwing an error
  if (!(/^[a-zA-Z0-9\s,.'-]+$/.test(description))) {
    throw new Error("Description must include only valid characters!");
  }

  return description;
};

export const isValidStatus = (status) => {
  // Checking if status is a valid string; if not, throwing an error (in isValidString)
  status = isValidString(status, "Status");

  // Checking if status is a valid status; if not, throwing an error
  let validStatuses = ['Open','In Progress','Resolved','Closed'];

  if(!(validStatuses.includes(status))) {
    throw new Error("Status must be a valid status (Open, In Progress, Resolved, or Closed)!");
  }

  return status;

};

/**
 * Gets a random element from an array
 */
export function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Formats a complaint type for display
 */
export function formatComplaintType(type) {
  if (!type) return 'Unknown';
  return type
    .replace('Noise - ', '')
    .replace('Noise', 'General Noise')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Generates a comparison summary between two neighborhoods
 */
export function generateComparisonSummary(profile1, profile2) {
  const parts = [];
  
  const scoreDiff = profile1.quietScore - profile2.quietScore;
  if (Math.abs(scoreDiff) < 0.5) {
    parts.push(`${profile1.name} and ${profile2.name} have similar noise levels`);
  } else if (scoreDiff > 0) {
    parts.push(`${profile1.name} is quieter than ${profile2.name}`);
  } else {
    parts.push(`${profile2.name} is quieter than ${profile1.name}`);
  }

  if (profile1.peakNoiseTime !== profile2.peakNoiseTime) {
    parts.push(`${profile1.name} is noisiest at ${profile1.peakNoiseTime.toLowerCase()}, while ${profile2.name} peaks during ${profile2.peakNoiseTime.toLowerCase()}`);
  }

  return parts.join('. ') + '.';
}
