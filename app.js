import express from 'express';
import { engine as exphbs } from 'express-handlebars';
import path from 'path';
import { fileURLToPath } from 'url';
import { startsBackStats } from './backStats.js';
// import routes from './routes/index.js';
import session from 'express-session';
import constructorMethod from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.engine('handlebars', exphbs({
  helpers: {
    increment: (val) => Number(val) + 1,
    decrement: (val) => Math.max(1, Number(val) - 1),
    eq: (a, b) => a === b, 
    intensityPercent: (val) => Number(val) * 10
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  name: 'AuthenticationState',
  secret: 'some secret string!',
  resave: false,
  saveUninitialized: false
}));

// ROUTES MIDDLEWARE ----------------------------------------------

// Root route
// Logging to console for every equest made to the server
app.use('/', (req, res, next) => {
  const timestamp = new Date().toUTCString();
  const method = req.method;
  const path = req.path;

  let authStatus = "(Non-Authenticated)";
  if (req.session.user) {
    authStatus = `(Authenticated ${req.session.user.role})`;
  }

  console.log(`[${timestamp}]: ${method} ${path} ${authStatus}`);

  next();

});




// GET /login route
app.get('/login', (req, res, next) => {
  if (!req.session.user) {
    // If user isn't logged in, allowing them to access login page
    return next();
  }

  // Otherwise:
  return res.redirect('/userProfile');

});




// GET /signup route
app.get('/signup', (req, res, next) => {
  if (!req.session.user) {
    // If user isn't authenticated/logged in, allowing them to sign up
    return next();
  }

  // Otherwise, redirecting them to userProfile page:
  return res.redirect('/userProfile');

});




// GET /userProfile route
app.get('/userProfile', (req, res, next) => {
  if (!req.session.user) {
    // If user is not logged in, redirecting to GET /login
    return res.redirect('/login');
  }

  // Otherwise, "falling through":
  return next();

});



// GET /signout route
app.get('/signout', (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  return next();

});


constructorMethod(app);


app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  startsBackStats();
});
