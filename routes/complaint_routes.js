import {Router} from 'express';
const router = Router();
import { getComplaintPage } from '../data/complaints.js';
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
          const complaintsWithCosigns = complaints.map((c) => ({
            ...c,
            cosignCount: c.cosignCount || 0,
            userHasCosigned: cosignedSet.has(c._id)
          }));

          return res.render('home', {
            title: 'Noise Complaint Detective',
            user,
            showCosignColumn: !!user,
            complaints: complaintsWithCosigns,
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
    });

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

export default router;
