import {Router} from 'express';
import xss from 'xss';
const router = Router();
import * as userDataFxns from '../data/users.js';
import * as helpers from '../helpers.js';

router
  .route('/signup')
  .get(async (req, res) => {
    //code here for GET
    // FILE: signup
    return res.render('signup', {title: "Sign Up"});
  })
  .post(async (req, res) => {
    //code here for POST
    // FILE: signup

    const signupBody = req.body;

    // console.log(signupBody);
    
    // Making sure that all fields are supplied in the req.body.
    // If any are missing: re-rendering form with a 400 status code
    // explaining to the user which fields are missing.
    let username = signupBody.username;
    let email = signupBody.email;
    let password = signupBody.password;
    let confirmPassword = signupBody.confirmPassword;
    let firstName = signupBody.firstName;
    let lastName = signupBody.lastName;
    let city = signupBody.city;
    let state = signupBody.state;
    let zipCode = signupBody.zipCode;
    let role = signupBody.role;

    // console.log("USERNAME VALUE:");
    // console.log(username);

    let notSupplied = {
      FirstName : !firstName,
      LastName : !lastName,
      Username : !username,
      Email : !email,
      Password : !password,
      ConfirmPassword : !confirmPassword,
      City : !city,
      State : !state,
      ZipCode : !zipCode,
      Role : !role
    }

    if(!firstName || !lastName || !username || !email || !password
        || !confirmPassword || !city || !state || !zipCode || !role) {
        
        let notSuppliedArr = [];
        for (const [key, value] of Object.entries(notSupplied)) {
          if(value == true) {
            notSuppliedArr.push(key);
          }
        }
        
        let unsuppliedElems = notSuppliedArr.join(', ');
        let errorMsg = `You forgot to supply the following fields: ${unsuppliedElems}`;

        return res.status(400).render('signup', {title: "Sign Up", error: errorMsg});
    }

    // console.log("BEFORE INPUT VALIDATION:");
    // console.log(firstName);
    // console.log(lastName);
    // console.log(username);
    // console.log();

    // Input validation:
    try {
      let allUsers = await userDataFxns.getAllUsers();
      username = helpers.isValidUsername(username, allUsers);
      let hashedPassword = helpers.isValidPassword(password);
      if(password != confirmPassword) {
        return res.status(400).render('signup', {title: "Sign Up", error: "Password and ConfirmPassword must match!"});
      }
      email = helpers.isValidEmail(email, allUsers);
      firstName = helpers.isValidName(firstName, "First name");
      lastName = helpers.isValidName(lastName, "Last name");
      // console.log(password);
      // console.log(confirmPassword);
      // console.log(username);
      city = helpers.isValidCity(city);
      state = helpers.isValidState(state);
      zipCode = helpers.isValidZipCode(zipCode);
      role = helpers.isValidRole(role);
    } catch(e) {
      // Rendering sign-up screen again, sending HTTP 400 status code
      // and showing an error message explaining what they entered incorrectly
      return res.status(400).render('signup', {title: "Sign Up", error: e});
    }
    

    // console.log();
    // console.log(firstName);
    // console.log(lastName);
    // console.log(username);
    // console.log(password);
    // console.log(role);
    // console.log();

    // Cleaning input fields from req.body to prevent XSS attacks
    username = xss(username);
    email = xss(email);
    password = xss(password);
    firstName = xss(firstName);
    lastName = xss(lastName);
    city = xss(city);
    state = xss(state);
    zipCode = xss(zipCode);
    role = xss(role);

    // Calling createAccount function with (now validated + cleaned) fields from req.body
    let result = await userDataFxns.createAccount(
        username,
        email,
        password,
        false,
        firstName,
        lastName,
        city,
        state,
        zipCode,
        role
    );

    if (result) {
      // Redirect the user to the /login page so they can log in
      return res.redirect('/login');
    } else {
      // Respond with a status code of 500 and error message saying "Internal Server Error"
      return res.status(500).render('signup', {title: "Sign Up", error: "Internal Server Error"});
    }

  });




router
  .route('/login')
  .get(async (req, res) => {
    //code here for GET
    // FILE: login
    return res.render('login', {title: "Log In"});

  })
  .post(async (req, res) => {
    //code here for POST
    // FILE: login

    const loginBody = req.body;
    
    // Making sure that username and password are supplied in the req.body.
    // If not: respond with an error and 400 status code    
    let username = loginBody.username;
    let password = loginBody.password;

    let notSupplied = {
      Username : !username,
      Password : !password
    }

    if(!username || !password) {
        
        let notSuppliedArr = [];
        for (const [key, value] of Object.entries(notSupplied)) {
          if(value == true) {
            notSuppliedArr.push(key);
          }
        }
        
        let unsuppliedElems = notSuppliedArr.join(', ');
        let errorMsg = `You forgot to supply the following fields: ${unsuppliedElems}`;

        return res.status(400).render('login', {title: "Log In", error: errorMsg});
    }

    // Input validation:
    // If invalid, render sign in screen, showing an error message (along with an HTTP 400 status code)
    try {
        username = helpers.isValidUsername(username);
        let hashedPassword = helpers.isValidPassword(password);
    } catch (e) {
        return res.status(400).render('login', {title: "Log In", error: e});
    }

    // Cleaning input fields from req.body to prevent XSS attacks
    username = xss(username);
    password = xss(password);

    try {
        // Calling logIn function
        let result = await userDataFxns.logIn(username, password);

        // Saving user session:
        req.session.user = {
            _id: result._id.toString(),
            username: result.username,
            email: result.email,
            emailVerified: result.emailVerified,
            firstName: result.firstName,
            lastName: result.lastName,
            city: result.city,
            state: result.state,
            zipCode: result.zipCode,
            role: result.role,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            lastLogin: result.lastLogin,
            submittedComplaints: result.submittedComplaints,
            cosignedComplaints: result.cosignedComplaints,
            commentedComplaints: result.commentedComplaints
        };



        // Redirecting to home page:
        return res.redirect('/');

    } catch (e) {
        return res.status(400).render('login', {title: "Log In", error: e});
    }

  });




router.route('/userProfile').get(async (req, res) => {
  //code here for GET
  // FILE: user

  // console.log(req.session.username);

  let createdAt = new Date(req.session.user.createdAt);
  let updatedAt = new Date(req.session.user.updatedAt);
  let lastLogin = new Date(req.session.user.lastLogin);

  let createdAtFormatted = `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}`;
  let updatedAtFormatted = `${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString()}`;
  let lastLoginFormatted = `${lastLogin.toLocaleDateString()} ${lastLogin.toLocaleTimeString()}`;

  return res.render('userProfile', {
    title: `${req.session.user.username}'s Profile`,
    currentTime: new Date().toLocaleTimeString(),
    currentDate: new Date().toLocaleDateString(),

    user: req.session.user,
    username: req.session.user.username,
    email: req.session.user.email,
    emailVerified: req.session.user.emailVerified,
    firstName: req.session.user.firstName,
    lastName: req.session.user.lastName,
    city: req.session.user.city,
    state: req.session.user.state,
    zipCode: req.session.user.zipCode,
    role: req.session.user.role,
    createdAt: createdAtFormatted,
    updatedAt: updatedAtFormatted,
    lastLogin: lastLoginFormatted,
    submittedComplaints: req.session.user.submittedComplaints,
    cosignedComplaints: req.session.user.cosignedComplaints,
    commentedComplaints: req.session.user.commentedComplaints
  });
});




router.route('/signout').get(async (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).render('error', {title: "Error", error: "Sign out failed"});
    }
    
    res.redirect('/');

  });
});

export default router;
