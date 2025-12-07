import complaintRoutes from './complaint_routes.js';
import userRoutes from './user_routes.js';

const constructorMethod = (app) => {
  app.use('/', complaintRoutes);
  app.use('/', userRoutes);

  app.use((req, res) => {
    return res.status(404).render('error', { title: "Error!", error: "Page not found!"});
  });
};

export default constructorMethod;
