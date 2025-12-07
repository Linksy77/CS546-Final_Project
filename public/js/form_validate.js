import * as usersFxns from '../../data/users.js';
import * as helpers from '../../helpers.js';
import bcrypt from 'bcryptjs';

let logInForm = document.getElementById('login-form');
let signUpForm = document.getElementById('signup-form');
let errorElem = document.getElementById('error');
errorElem.hidden = true;

// If the page is the login page:
if(logInForm) {
    logInForm.addEventListener("submit", (event) => {
        event.preventDefault();

        let username = (document.getElementById("username").value).trim();
        let password = document.getElementById("password").value;
        let trimmedPassword = password.trim();

        let notSupplied = {
            Username : !username,
            Password : !trimmedPassword
        };

        // If user did not submit either of the inputs:
        if(!username || !trimmedPassword) {
        
            let notSuppliedArr = [];
            for (const [key, value] of Object.entries(notSupplied)) {
              if(value == true) {
                notSuppliedArr.push(key);
              }
            }
            
            let unsuppliedElems = notSuppliedArr.join(', ');
            let errorMsg = `You forgot to supply the following fields: ${unsuppliedElems}`;
    
            errorElem.innerHTML = `ERROR! ${errorMsg}`;
            errorElem.hidden = false;

        } else {
            // User supplied fields
            // Validating user input:
            try {
                username = helpers.isValidUsername(username);
                let hashedPassword = helpers.isValidPassword(password);

                // INPUTS ARE VALID:
                errorElem.hidden = true;
                logInForm.submit();

            } catch (e) {
                errorElem.innerHTML = `ERROR! ${e}`;
                errorElem.hidden = false;
            }
        }
    });
}




// If the page is the signup page:
if(signUpForm) {
    signUpForm.addEventListener("submit", (event) => {
        event.preventDefault();

        let username = (document.getElementById("username").value).trim();
        let email = (document.getElementById("email").value).trim();
        let password = (document.getElementById("password").value).trim();
        let confirmPassword = (document.getElementById("confirmPassword").value).trim();
        let firstName = (document.getElementById("firstName").value).trim();
        let lastName = (document.getElementById("lastName").value).trim();
        let city = (document.getElementById("city").value).trim();
        let state = (document.getElementById("state").value).trim();
        let zipCode = (document.getElementById("zipCode").value).trim();
        let role = (document.getElementById("role").value).trim();

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
        };

        // If user did not submit either of the inputs:
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
    
            errorElem.innerHTML = `ERROR! ${errorMsg}`;
            errorElem.hidden = false;

        } else {
            // User supplied fields
            // Validating user input:
            try {
                let allUsers = usersFxns.getAllUsers();
                username = helpers.isValidUsername(username, allUsers);
                email = helpers.isValidEmail(email, allUsers);

                let hashedPassword = helpers.isValidPassword(password);
                if(password != confirmPassword) {
                    throw new Error("Password and ConfirmPassword must match!");
                }

                firstName = helpers.isValidName(firstName, "First name");
                lastName = helpers.isValidName(lastName, "Last name");
                city = helpers.isValidCity(city);
                state = helpers.isValidState(state);
                zipCode = helpers.isValidZipCode(zipCode);
                role = helpers.isValidRole(role);

                // INPUTS ARE VALID:
                errorElem.hidden = true;
                signUpForm.submit();

            } catch (e) {
                errorElem.innerHTML = `ERROR! ${e}`;
                errorElem.hidden = false;
            }
        }


    });
}