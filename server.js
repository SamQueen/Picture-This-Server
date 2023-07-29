const express = require('express');
const cors = require("cors");
const multer = require("multer");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");
const crypto = require('crypto');
var async = require('async');
const { S3Client, AbortMultipartUploadCommand, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config()

// middleware
app.use(cors({
    origin: ["http://localhost:3000"],
    methods: ["POST", "GET"],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(session({
    secret: 'secret', // secret key used to encrypt the cookie
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24,
    }
}));

// resources
const pool = require('./resources/Database');
const s3 = require('./resources/S3Bucket');
const generateURL = require('./resources/BucketUrl');

// import routes
const handleUserRoute = require('./routes/HandleUser');
const likesRoute = require('./routes/Likes');
const commentsRoute = require('./routes/Comments');
const friendRoute = require('./routes/Friend');
const tagsRoute = require('./routes/Tags');

// routes
app.use('/HandleUser', handleUserRoute);
app.use('/likes', likesRoute);
app.use('/comments', commentsRoute);
app.use('/friend', friendRoute);
app.use('/tags', tagsRoute);

// User info. This is set when the user logs in.
const user = require('./resources/User');

// generate random unique image name
const uniqueImageName = (bytes = 8) => crypto.randomBytes(bytes).toString('hex');

//used to upload to s3 bucket 
const storage = multer.memoryStorage();
const upload = multer({storage: storage});


/******* Get and Post requests *******/

// check if session already exists
app.get('/', (req,res) => {
    res.sendStatus(200);
});

// check if session exists
app.get('/session', (req, res) => {
    if(req.session.username) {
        res.json({valid: true, username: req.session.username})
    } else {
        res.json({valid: false})
    }
});


// create post
app.post('/uploadPhotos', upload.single('file'), async function(req,res) {
    const imageFileName = uniqueImageName();
    const caption = req.body.caption;
    const toggle = false;
    const query = "INSERT INTO photos (photo_owner_id, photo, caption, public, date) VALUES(?,?,?,?,?); SELECT LAST_INSERT_ID();";
    const query2 = 'INSERT INTO tags VALUES(?,?);';
    var clientResponse = 'success';
    var time = new Date()
    
    // send file to amazon s3 bucket
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: imageFileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
    }
    const command = new PutObjectCommand(params)
    await s3.send(command);

    // always appends an empty string to the end
    const tagArray = req.body.tags.split(' ');
    
    console.log('adding post to database')

    // query
    pool.query( query, [user.user_id, imageFileName, caption, 1, time], (error, results) => {
        
        if (error) {
            console.log('error adding photo: ' + error);
            clientResponse = "error";
        }

        const photo_id = results[0].insertId;
        
        // add tags for photo
        async.forEachOf(tagArray, function (tag, i, inner_callback){     
            // make sure tag isn't empty
            if (tag != '') {
                pool.query(query2, [tag, photo_id], (error) =>{
                    if(!error){
                        inner_callback(null);
                    } else {
                        console.log("Error while adding tags");
                        inner_callback(error);
                    };
                });
            }
        });

        res.send(clientResponse);
    });
});

// change user profile
app.post('/changeProfilePhoto', upload.single('file'), async function(req, res) {
    var clientResponse = "success";
    const imageFileName = uniqueImageName();
    const query = 'UPDATE users SET profile_photo = ? WHERE user_id = ?;';

    // update profile photo path
    user.profile_photo_path = imageFileName;
    
    // send file to amazon s3 bucket
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: imageFileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
    }
    const command = new PutObjectCommand(params)
    await s3.send(command);
    
    // query
    pool.query( query, [imageFileName.toString(), user.user_id,], (error) => {
        if (error) {
            console.log('error changing profile photo: ' + error)
            clientResponse = "fail"
        }
        
        res.send(clientResponse);
    });
});

// delete post
app.post('/deletePost', (req, res) => {
    const query = 'DELETE FROM photos WHERE photo_id = ?;'
    const photo_id = req.body.photoId;
    var clientResponse = 'success'

    pool.query( query, [photo_id], (error) => {
            
        if (error) {
            console.log(error)
            clientResponse = "fail"
        }
        
        res.send(clientResponse);
    });
});

// get all of the users posts 
app.get('/getUserPosts', (req, res) => {
    const query = 'SELECT first_name, profile_photo, photo_id, last_name, photo, caption, photo, date, '+
                '(SELECT count(*) FROM likes WHERE photo_id=photos.photo_id) as like_count '+
                'FROM photos '+
                'left JOIN users '+
                'ON users.user_id = photos.photo_owner_id '+
                'WHERE users.user_id = ?;';

    // query
    pool.query( query, [user.user_id], (error, results) => {
        
        if (error) {
            console.log('error getting user posts: ' + error);
            res.send({});
        }

        // set urls for photos. needs to be async
        (async () => {

            for (var i = 0; i < results.length; i++) {
                const photo_url = await generateURL(results[i].photo);
                const profile_url = await generateURL(results[i].profile_photo);
                results[i].photo = photo_url;
                results[i].profile_photo = profile_url;
            }

            res.send(results);
        })();
    });
});

//get all posts
app.get('/getAllPosts', (req, res) => {
    const query = 'SELECT first_name, profile_photo, photo_id, last_name, photo, caption, photo, date, '+ 
                '(SELECT count(*) FROM likes WHERE photo_id=photos.photo_id) as like_count ' +
                'FROM photos ' +
                'LEFT Join users ' +
                'ON photo_owner_id = user_id;'

    pool.query(query, [user.user_id], (err, results) => {
        if (err) {
            console.log('error getting all posts: ' + err);
            res.send({});
        }

        // set urls for photos. needs to be async
        (async () => {
            for (var i = 0; i < results.length; i++) {
                const photo_url = await generateURL(results[i].photo);
                const profile_url = await generateURL(results[i].profile_photo);
                results[i].photo = photo_url;
                results[i].profile_photo = profile_url;
            }

            res.send(results);
        })(); 
    });
});

// Recommended posts
app.get('/recommendedPosts', (req, res) => {
    const query = `SELECT DISTINCT photos.photo_id, photos.caption, photos.photo, photos.date, users.profile_photo, users.first_name, users.last_name
               FROM photos AS photos
               JOIN likes AS likes ON photos.photo_id = likes.photo_id
               JOIN users AS users ON photos.photo_owner_id = users.user_id
               WHERE photos.photo_owner_id != ? AND likes.like_owner_id != ? AND photos.photo_id NOT IN
               (SELECT photo_id FROM likes WHERE likes.like_owner_id = ?)
               LIMIT 5;`;

    pool.query( query, [user.user_id, user.user_id, user.user_id], (error, results) => {
        if (error) {
            console.log("Error getting recommended posts: " + error.code);
            res.send([]);
        }

        var normalResults = results.map((mysqlObj, index) => {
            return Object.assign({}, mysqlObj)
        });    
        
        // set urls for photos. needs to be async
        (async () => {

        for (var i = 0; i < normalResults.length; i++) {
            const photo_url = await generateURL(normalResults[i].photo);
            const profile_url = await generateURL(normalResults[i].profile_photo);
            normalResults[i].photo = photo_url;
            normalResults[i].profile_photo = profile_url;
        }

        res.send(normalResults);
        })();
    });
});

// listen on port 5000
app.listen(5000, () => {
    console.log("servers started on port 5000");
});
