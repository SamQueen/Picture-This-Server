const express = require("express");
const router = express.Router();
const pool = require('../resources/Database');
const user = require('../resources/User');
const generateURL = require('../resources/BucketUrl');

// get comments for a specific photo_id
router.get('/getComments', (req,res) => {
    const photo_id = req.query.photoId;
    const query1 = 'SELECT comment, date, first_name, last_name, profile_photo FROM comments JOIN users ON user_id = comment_owner_id WHERE photo_id = ?;'
    var normalResults;

    pool.query( query1, [photo_id], (error, results) => {
        if (error) {
            console.log(error.code);
            res.send({});
        }
            
        normalResults = results.map((mysqlObj, index) => {
            return Object.assign({}, mysqlObj)
        });

        // add id to comments
        for (var i in normalResults) {
            normalResults[i].key = 1;
        }

        // set urls for photos. needs to be async
        (async () => {

            for (var i = 0; i < normalResults.length; i++) {
                const profile_url = await generateURL(normalResults[i].profile_photo);
                normalResults[i].profile_photo = profile_url;
            }

            res.send(normalResults);
        })();
    });
});

// add comments
router.post('/addComment', (req,res) => {
    const comment = req.body.comment;
    const photo_id = req.body.photoId;
    var clientResponse = 'success';
    var time = new Date();
    const query = 'INSERT INTO comments VALUE(?,?,?,?);';
    
    pool.query( query, [photo_id, user.user_id, comment, time], (error) => {
        
        if (error) {
            console.log('Error adding comment: ' + error.code);
            clientResponse = error;
        }

        res.send(clientResponse);
    });
});

module.exports = router;