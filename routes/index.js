import { getComplaintPage } from '../data/complaints.js';

const constructorMethod = (app) => {
  app.get('/', async (req, res) => {
    try {
      const page = parseInt(req.query.page || '1', 10);
      const limit = parseInt(req.query.limit || '25', 10);

      const { complaints, total, totalPages } = await getComplaintPage(page, limit);
      return res.render('home', {
        title: 'Noise Complaint Detective',
        complaints,
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
};

export default constructorMethod;
