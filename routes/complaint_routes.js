import {Router} from 'express';
import xss from 'xss';
const router = Router();
import {
  getComplaintPage,
  searchComplaints,
  getTopDescriptions,
  getComplaintsByDescription,
  getTimeHeatmap
} from '../data/complaints.js';
import { neighborhoods } from '../config/mongoCollections.js';
import * as userDataFxns from '../data/users.js';
import * as helpers from '../helpers.js';
import { toggleCosign } from '../data/cosigns.js';
import { isValidObjectId } from '../helpers.js';

router
    .route('/')
    .get(async (req, res) => {
        try {
          const page = parseInt(req.query.page || '1', 10);
          const limit = parseInt(req.query.limit || '25', 10);
    
          const { complaints, total, totalPages } = await getComplaintPage(page, limit);
          const user = req.session.user || null;
          const cosignedSet = new Set(user?.cosignedComplaints || []);
          const complaintsWithCosignsAndComments = complaints.map((c) => ({
            ...c,
            cosignCount: c.cosignCount || 0,
            comments: c.comments,
            userHasCosigned: cosignedSet.has(c._id)
          }));

          return res.render('home', {
            title: 'Noise Complaint Detective',
            user,
            showCosignColumn: !!user,
            complaints: complaintsWithCosignsAndComments,
            page,
            totalPages,
            limit,
            queryLimit: limit,
            hasPrev: page > 1,
            hasNext: page < totalPages
          });
        } catch (e) {
          console.error('Error fetching complaints', e);
          return res.status(500).render('home', {
            title: 'Noise Complaint Detective',
            complaints: [],
            message: 'Unable to load complaints right now.'
          });
        }
    })
    .post(async (req, res) => {
      // When user submits their own noise complaint:
      const complaintSubmissionBody = req.body;

      // Making sure that all fields are supplied in the req.body.
      // If any ar missing: re-rendering form with a 400 status code
      // explaining to the user which fields are missing
      let complaintType = complaintSubmissionBody.complaintType;
      let address = complaintSubmissionBody.address;
      let borough = complaintSubmissionBody.borough;
      let block = complaintSubmissionBody.block;
      let neighborhood = complaintSubmissionBody.neighborhood;
      let zipCode = complaintSubmissionBody.zipCode;
      let latitude = complaintSubmissionBody.latitude;
      let longitude = complaintSubmissionBody.longitude;
      let timeOfDay = complaintSubmissionBody.timeOfDay;
      let dayOfWeek = complaintSubmissionBody.dayOfWeek;
      let intensity = complaintSubmissionBody.intensity;
      let description = complaintSubmissionBody.description;
      let status = complaintSubmissionBody.status;

      let notSupplied = {
        ComplaintType : !complaintType,
        Address : !address,
        Borough : !borough,
        Block : !block,
        Neighborhood : !neighborhood,
        ZipCode : !zipCode,
        Latitude : !latitude,
        Longitude : !longitude,
        TimeOfDay : !timeOfDay,
        DayOfWeek : !dayOfWeek,
        Intensity : !intensity,
        Description : !description,
        Status : !status
      }

      if(!complaintType || !address || !borough || !block || !neighborhood
          || !zipCode || !latitude || !longitude || !timeOfDay || !dayOfWeek
          || !intensity || !description || !status) {

        let notSuppliedArr = [];
        for (const [key, value] of Object.entries(notSupplied)) {
          if(value == true) {
            notSuppliedArr.push(key);
          }
        }
        
        let unsuppliedElems = notSuppliedArr.join(', ');
        let errorMsg = `You forgot to supply the following fields: ${unsuppliedElems}`;

        return res.status(400).render('home', {title: "Noise Complaint Detective", message: errorMsg});
      }
      
      // Cleaning input fields from req.body to prevent XSS attacks
      complaintType = xss(complaintType);
      address = xss(address);
      borough = xss(borough);
      block = xss(block);
      neighborhood = xss(neighborhood);
      zipCode = xss(zipCode);
      // !! complaintGeoJSONPoint lacking cleaning
      timeOfDay = xss(timeOfDay);
      dayOfWeek = xss(dayOfWeek);
      intensity = xss(intensity);
      description = xss(description);
      status = xss(status);

      // Input validation:
      try {
        complaintType = helpers.isValidComplaintType(complaintType);
        address = helpers.isValidAddressFormat(address);
        borough = helpers.isValidBorough(borough);
        neighborhood = helpers.isValidNeighborhood(neighborhood);
        zipCode = helpers.isValidZipCode(zipCode);

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

        block = helpers.isValidBlockNumber(block);

        let validNeighborhoodBlocks = await currNeighborhoodData.blocks;

        if(!(validNeighborhoodBlocks.includes(block))) {
            throw new Error("Block number must correlate to proper neighborhood!");
        }

        latitude = Number(latitude);
        longitude = Number(longitude);
        let complaintGeoJSONPoint = helpers.isValidLocation(longitude, latitude);
        timeOfDay = helpers.isValidTimeOfDay(timeOfDay);
        dayOfWeek = helpers.isValidDayOfWeek(dayOfWeek);
        intensity = Number(intensity);
        intensity = helpers.isValidIntensity(intensity);
        description = helpers.isValidDescription(description);
        status = helpers.isValidStatus(status);
      } catch (e) {
        // Rendering home page again, sending HTTP 400 status code
        // and showing an error message explaining what they entered incorrectly
        return res.status(400).render('home', {title: "Noise Complaint Detective", message: e});
      }

      // Calling submitNoiseComplaint with necessary information:
      try {
        let updatedUserInfo = await userDataFxns.submitNoiseComplaint(
          req.session.user._id,
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
        );

        // console.log("updatedUserInfo (complaint_routes) = ");
        // console.log(updatedUserInfo);

        // Updating session's submittedComplaints with updated submittedComplaints list:
        req.session.user.submittedComplaints = updatedUserInfo.submittedComplaints;

        // console.log("updatedUserInfo.submittedComplaints =");
        // console.log(updatedUserInfo.submittedComplaints);
        // console.log("req.session.user.submittedComplaints =");
        // console.log(req.session.user.submittedComplaints);

      } catch (e) {
        return res.status(400).render('home', {title: "Noise Complaint Detective", message: e});
      }

      // If all works well, re-rendering page with updated complaints:
      try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '25', 10);
  
        const { complaints, total, totalPages } = await getComplaintPage(page, limit);
        const user = req.session.user || null;
        const cosignedSet = new Set(user?.cosignedComplaints || []);
        const complaintsWithCosignsAndComments = complaints.map((c) => ({
          ...c,
          cosignCount: c.cosignCount || 0,
          comments: c.comments,
          userHasCosigned: cosignedSet.has(c._id)
        }));

        return res.render('home', {
          title: 'Noise Complaint Detective',
          user,
          showCosignColumn: !!user,
          complaints: complaintsWithCosignsAndComments,
          page,
          totalPages,
          limit,
          queryLimit: limit,
          hasPrev: page > 1,
          hasNext: page < totalPages
        });
      } catch (e) {
        console.error('Error fetching complaints', e);
        return res.status(500).render('home', {
          title: 'Noise Complaint Detective',
          complaints: [],
          message: 'Unable to load complaints right now.'
        });
      }

    })

router.post('/complaints/:id/cosign', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const complaintId = req.params.id;

  try {
    isValidObjectId(complaintId, 'Complaint ID');
  } catch (e) {
    return res.status(400).json({ error: e.toString() });
  }

  const userId = req.session.user._id || req.session.user.id;
  if (!userId) {
    return res.status(400).json({ error: 'User ID missing from session' });
  }

  try {
    const result = await toggleCosign(complaintId, userId);

    const updatedCosigned = new Set(req.session.user.cosignedComplaints || []);
    if (result.hasCosigned) updatedCosigned.add(complaintId);
    else updatedCosigned.delete(complaintId);
    req.session.user.cosignedComplaints = Array.from(updatedCosigned);

    return res.json({
      success: true,
      hasCosigned: result.hasCosigned,
      cosignCount: result.cosignCount
    });
  } catch (e) {
    console.error('Cosign toggle failed', e);
    return res.status(500).json({ error: 'Could not update cosign' });
  }
});

router.post('/complaints/:id/comments', async (req, res) => {
  if(!req.session.user) {
    return res.status(401).render('home', {message: "You must be logged in!"});
  }

  let complaintId = req.params.id;
  let commentText = xss(req.body.commentText);

  try {
    isValidObjectId(complaintId, "Complaint ID");
    helpers.isValidString(commentText, "Comment text");

    let updatedUserInfo = await userDataFxns.commentOnComplaint(
      req.session.user._id,
      complaintId,
      commentText
    );

    const page = req.body.page || 1;
    const limit = req.body.limit || 25;

    req.session.user.commentedComplaints = updatedUserInfo.commentedComplaints;

    return res.redirect(`/?page=${page}&limit=${limit}#comments-${req.params.id}`);

  } catch (e) {
    return res.status(400).render('home', { message: e.toString() });
  }


})

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const description = (req.query.description || '').trim();
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '25', 10);

    const descriptions = await getTopDescriptions(50);

    if (!q && !description) {
      return res.render('search', {
        title: 'Search',
        user: req.session.user || null,
        q: '',
        complaints: [],
        hasResults: false,
        descriptions,
        selectedDescription: ''
      });
    }

    let result;
    if (description && !q) {
      result = await getComplaintsByDescription(description, { page, limit });
    }
    else if (q && !description) {
      result = await searchComplaints(q, { page, limit });
    }
    else {
      const base = await searchComplaints(q, { page, limit });
      const filtered = base.complaints.filter((c) => (c.description || '').trim() === description);
      const total = filtered.length;
      const totalPages = 1;

      result = {
        complaints: filtered,
        page: 1,
        limit: base.limit,
        total,
        totalPages,
        hasPrev: false,
        hasNext: false
      };
    }

    return res.render('search', {
      title: 'Search',
      user: req.session.user || null,
      q,
      ...result,
      descriptions,
      selectedDescription: description,
      queryLimit: result.limit,
      hasResults: result.complaints.length > 0
    });
  } catch (e) {
    return res.status(400).render('search', {
      title: 'Search',
      user: req.session.user || null,
      q: req.query.q || '',
      complaints: [],
      hasResults: false,
      error: e?.message || 'Invalid search query.'
    });
  }
});

router.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '25', 10);

    const result = await searchComplaints(q, { page, limit });
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: e?.message || 'Invalid search query.' });
  }
});

router.get('/api/descriptions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const descriptions = await getTopDescriptions(limit);
    return res.json({ descriptions });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load descriptions.' });
  }
});

router.get('/api/filter', async (req, res) => {
  try {
    const description = req.query.description;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '25', 10);

    const result = await getComplaintsByDescription(description, { page, limit });
    return res.json(result);
  } catch (e) {
    return res.status(400).json({ error: e?.message || 'Invalid filter.' });
  }
});

router.get('/heatmap', async (req, res) => {
  return res.render('heatmap', {
    title: 'Heat Map',
    user: req.session.user || null
  });
});

router.get('/api/heatmap-time', async (req, res) => {
  try {
    const heatmap = await getTimeHeatmap();
    return res.json(heatmap);
  } catch (e) {
    console.error('Error building heatmap', e);
    return res.status(500).json({ error: 'Failed to load heatmap.' });
  }
});

export default router;
