const express = require("express");
const router = express.Router();
const pool = require('../resources/Database');
const user = require('../resources/User');
const generateURL = require('../resources/BucketUrl');

// get tags of a photo
router.get('/getTags', (req,res) => {
    const photo_id = req.query.photoId;
    const query = 'SELECT tag FROM tags WHERE photo_id=?';

    pool.query( query, [photo_id], (error, results)  => {
        
        if (error) {
            console.log("error getting tags " + error.code);
            res.send({});
        }

        var normalResults = results.map((mysqlObj, index) => {
            return Object.assign({}, mysqlObj)
        });    
            
        // assign unique key to each tag
        for (var i in normalResults) {
            var keyTime = new Date();
            normalResults[i].key = i + keyTime;
        }

        res.send(normalResults);
    });
});

// search posts by specified tag name
router.get('/searchByTag', (req,res) => {
    const tag_name = '#' + req.query.tagName;
    const query = 'SELECT first_name, profile_photo, photos.photo_id, last_name, photo, caption, photo, date FROM tags AS tags '+
                'LEFT JOIN photos AS photos '+
                'ON tags.photo_id = photos.photo_id '+
                'LEFT JOIN users AS users '+
                'ON photos.photo_owner_id = users.user_id '+
                'WHERE tag LIKE ?;';

    pool.query( query, [tag_name], (error, results)  => {
        
        if (error) {
            console.log("Error searching tag name " + error.code);
            res.send();
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

// search posts by specified tag name
// only return user posts
router.get('/searchByTagUser', (req,res) => {
    const tag_name = '#' + req.query.tagName;
    const query = 'SELECT first_name, profile_photo, photos.photo_id, last_name, photo, caption, photo, date FROM tags AS tags '+
                'LEFT JOIN photos AS photos '+
                'ON tags.photo_id = photos.photo_id '+
                'LEFT JOIN users AS users '+
                'ON photos.photo_owner_id = users.user_id '+
                'WHERE tag LIKE ? ' +
                'AND users.user_id = 100020;';

    pool.query( query, [tag_name, user.user_id], (error, results)  => {
        
        if (error) {
            console.log("Error searching tag name " + error.code);
            res.send({});
        }
                
        var normalResults = results.map((mysqlObj, index) => {
            return Object.assign({}, mysqlObj)
        });    
        
        res.send(normalResults);
    });
});

// gets the most popular posts by tag name
router.get('/getPopularTags', (req,res) => {
    // had to run this to get query to work
    //SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));
    const query = 'SELECT first_name, profile_photo, photos.photo_id, last_name, photo, caption, photo, date '+
                'FROM tags AS tagss '+
                'LEFT JOIN photos AS photos '+
                'ON tags.photo_id = photos.photo_id '+
                'LEFT JOIN users AS users '+
                'ON photos.photo_owner_id = users.user_id '+
                'GROUP BY tags.photo_id '+
                'ORDER BY count(tag);'

    pool.query( query, (error, results)  => {
        if (error) {
            console.log("error getting popular tags: " + error.code);
            res.send({});
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


module.exports = router;