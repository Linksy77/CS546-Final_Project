import { dbConnection, closeConnection } from '../config/mongoConnection.js';
import * as neighborhoodsData from '../data/neighborhoods.js';

// They said they wanted seeds for each data model, but I don't know if we need a separate one for each or if this one is good on its own so here it is for now.

// NYC Community District Samples mapped to neighborhoods
// Source: NYC Open Data
const nycNeighborhoods = [
  // MANHATTAN
  {
    name: 'Lower Manhattan',
    borough: 'Manhattan',
    communityDistrict: '01',
    blocks: ['600', '601', '602', '603', '604', '605'], 
    zipCodes: ['10004', '10005', '10006', '10007', '10038', '10280']
  },
  {
    name: 'Greenwich Village/SoHo',
    borough: 'Manhattan',
    communityDistrict: '02',
    blocks: ['500', '501', '502', '503', '504', '505'],
    zipCodes: ['10012', '10013', '10014']
  },
  {
    name: 'Lower East Side/Chinatown',
    borough: 'Manhattan',
    communityDistrict: '03',
    blocks: ['300', '301', '302', '303', '304'],
    zipCodes: ['10002', '10009', '10013']
  },
  {
    name: 'Chelsea/Clinton/Midtown',
    borough: 'Manhattan',
    communityDistrict: '04',
    blocks: ['700', '701', '702', '703', '704'],
    zipCodes: ['10001', '10011', '10018', '10019', '10036']
  },
  {
    name: 'Midtown',
    borough: 'Manhattan',
    communityDistrict: '05',
    blocks: ['1200', '1201', '1202', '1203', '1204'],
    zipCodes: ['10016', '10017', '10022']
  },
  {
    name: 'Stuyvesant Town/Turtle Bay',
    borough: 'Manhattan',
    communityDistrict: '06',
    blocks: ['900', '901', '902', '903', '904'],
    zipCodes: ['10010', '10016', '10017', '10022']
  },
  {
    name: 'Upper West Side',
    borough: 'Manhattan',
    communityDistrict: '07',
    blocks: ['1100', '1101', '1102', '1103', '1104'],
    zipCodes: ['10023', '10024', '10025']
  },
  {
    name: 'Upper East Side',
    borough: 'Manhattan',
    communityDistrict: '08',
    blocks: ['1400', '1401', '1402', '1403', '1404'],
    zipCodes: ['10021', '10028', '10044', '10065', '10075']
  },
  {
    name: 'Morningside Heights/Hamilton Heights',
    borough: 'Manhattan',
    communityDistrict: '09',
    blocks: ['1900', '1901', '1902', '1903', '1904'],
    zipCodes: ['10025', '10026', '10027', '10031']
  },
  {
    name: 'Central Harlem',
    borough: 'Manhattan',
    communityDistrict: '10',
    blocks: ['1700', '1701', '1702', '1703', '1704'],
    zipCodes: ['10026', '10027', '10030', '10037']
  },
  {
    name: 'East Harlem',
    borough: 'Manhattan',
    communityDistrict: '11',
    blocks: ['1600', '1601', '1602', '1603', '1604'],
    zipCodes: ['10029', '10035']
  },
  {
    name: 'Washington Heights/Inwood',
    borough: 'Manhattan',
    communityDistrict: '12',
    blocks: ['2100', '2101', '2102', '2103', '2104'],
    zipCodes: ['10032', '10033', '10034', '10040']
  },

  // BROOKLYN
  {
    name: 'Williamsburg/Greenpoint',
    borough: 'Brooklyn',
    communityDistrict: '01',
    blocks: ['2300', '2301', '2302', '2303', '2304'],
    zipCodes: ['11211', '11222']
  },
  {
    name: 'Brooklyn Heights/Fort Greene',
    borough: 'Brooklyn',
    communityDistrict: '02',
    blocks: ['2100', '2101', '2102', '2103', '2104'],
    zipCodes: ['11201', '11205', '11217']
  },
  {
    name: 'Bedford-Stuyvesant',
    borough: 'Brooklyn',
    communityDistrict: '03',
    blocks: ['3100', '3101', '3102', '3103', '3104'],
    zipCodes: ['11205', '11206', '11216', '11221', '11233']
  },
  {
    name: 'Bushwick',
    borough: 'Brooklyn',
    communityDistrict: '04',
    blocks: ['3300', '3301', '3302', '3303', '3304'],
    zipCodes: ['11206', '11221', '11237']
  },
  {
    name: 'Park Slope/Carroll Gardens',
    borough: 'Brooklyn',
    communityDistrict: '06',
    blocks: ['2900', '2901', '2902', '2903', '2904'],
    zipCodes: ['11215', '11217', '11231']
  },

  // QUEENS 
  {
    name: 'Astoria/Long Island City',
    borough: 'Queens',
    communityDistrict: '01',
    blocks: ['4100', '4101', '4102', '4103', '4104'],
    zipCodes: ['11101', '11102', '11103', '11104', '11105', '11106']
  },
  {
    name: 'Flushing/Whitestone',
    borough: 'Queens',
    communityDistrict: '07',
    blocks: ['4900', '4901', '4902', '4903', '4904'],
    zipCodes: ['11354', '11355', '11356', '11357', '11358']
  },
  {
    name: 'Jackson Heights/Corona',
    borough: 'Queens',
    communityDistrict: '03',
    blocks: ['4500', '4501', '4502', '4503', '4504'],
    zipCodes: ['11368', '11369', '11372']
  },

  // BRONX
  {
    name: 'Mott Haven/Hunts Point',
    borough: 'Bronx',
    communityDistrict: '01',
    blocks: ['5100', '5101', '5102', '5103', '5104'],
    zipCodes: ['10451', '10452', '10454', '10455']
  },
  {
    name: 'Fordham/University Heights',
    borough: 'Bronx',
    communityDistrict: '05',
    blocks: ['5500', '5501', '5502', '5503', '5504'],
    zipCodes: ['10453', '10457', '10458', '10468']
  },

  // STATEN ISLAND
  {
    name: 'St. George/Stapleton',
    borough: 'Staten Island',
    communityDistrict: '01',
    blocks: ['6100', '6101', '6102', '6103', '6104'],
    zipCodes: ['10301', '10304', '10305']
  }
];

const main = async () => {
  const db = await dbConnection();
  
  try {
    await db.dropCollection('neighborhoods');
    console.log('Dropped neighborhoods collection\n');
  } catch (e) {
    console.log('Neighborhoods collection does not exist yet, creating it...\n');
  }

  console.log('Currently Seeding NYC Neighborhoods (Community Districts)\n');
  console.log('This represents some actual NYC community districts that map to 311 data\n');

  try {
    let createdCount = 0;

    for (const hood of nycNeighborhoods) {
      // Using placeholder data for now. Will use 311 Data after.
      const neighborhood = await neighborhoodsData.createNeighborhood(
        hood.name,
        hood.borough,
        hood.communityDistrict, 
        hood.blocks,
        hood.zipCodes,
        7.0, // Default
        0,   // No Complaints Added Yet
        5.0, // Average Intensity
        'Statistics pending complaint data analysis',
        [
          { type: 'Loud Music/Party', count: 0, percentage: 0 },
          { type: 'Construction', count: 0, percentage: 0 }
        ],
        'Night',
        'Friday'
      );
      
      createdCount++;
      console.log(`Successfully Created: ${neighborhood.name} (${neighborhood.borough})`);
    }

    console.log(`\nSuccessfully seeded ${createdCount} NYC neighborhoods\n`);

    // Display summary
    console.log('Summary by Borough:');
    const allNeighborhoods = await neighborhoodsData.getAllNeighborhoods();
    const boroughs = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
    
    for (const borough of boroughs) {
      const count = allNeighborhoods.filter(n => n.borough === borough).length;
      console.log(`   ${borough}: ${count} neighborhoods`);
    }

  } catch (e) {
    console.error('Error during seeding:');
    console.error(e);
  }

  await closeConnection();
  console.log('Database connection closed.');
};

main();