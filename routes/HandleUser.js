const express = require("express");
const router = express.Router();
const user = require('../resources/User');
const pool = require('../resources/Database');
const generateURL = require('../resources/BucketUrl');
const MD5 = require('crypto-js/md5');


// check login credentials before logging in
router.post('/login', (req,res) => {
    const username = req.body.username;
    const password = req.body.password;
    const query = 'SELECT username, password, user_id, first_name, last_name, profile_photo FROM users WHERE username = ?';
    
    // perform query to find the password of the user
    pool.query( query, [username], (error, results) => {
        // check for an error
        if (error) {
            clientResponse ='error';
            res.json({error: error});
            return;
        }

        // check if nothing is returned
        if (results === undefined || results.length == 0) {
            clientResponse = 'error';
            res.json({login: false, username: ''});
            return;
        }

        var result = results[0];
        // set session username
        req.session.username = result.username;

        // get the hased password
        const hashedPassword = MD5(password).toString();

        // set the user variables if the password matches
        if (result.password == hashedPassword) {           
            user.user_id = result.user_id;
            user.first_name = result.first_name;
            user.last_name = result.last_name;
            user.profile_photo_path = result.profile_photo;
        } else {
            console.log('login fail');
            res.json({login: false, username: ''});
            return;
        }

        res.json({login: true, username: req.session.username});
    });
    
});

// add user to database
router.post('/addUser', (req,res) => {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const username = req.body.username;
    const password = req.body.password;
    const hashedPassword = MD5(password).toString();
    const gender = req.body.gender;
    const dob = req.body.dob;
    const hometown = req.body.hometown;
    const profile_photo = 'no-photo.jpeg'; 
    var clientResponse = "success";
    const query = "INSERT INTO users" + 
                " (username, first_name, last_name, dob, email, gender, password, hometown, profile_photo)" +
                " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

    console.log("adding account");

    // query
    pool.query( query,
        [username, firstName, lastName, dob, email, gender, hashedPassword, hometown, profile_photo],
        (error) => {
            if (error) {
                console.log(error.code);
                clientResponse = error.code;
            } else {
                console.log('account added');
            }

            res.send(clientResponse);
        }
    )
});

// get basic profile data
router.get('/getProfileData', async(req, res) => {
    const imageURL = await generateURL(user.profile_photo_path);
    
    res.json({
        "first_name": user.first_name,
        "last_name": user.last_name,
        "profile_photo": imageURL
    });
});


module.exports = router; 