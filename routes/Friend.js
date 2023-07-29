const express = require("express");
const router = express.Router();
const pool = require('../resources/Database');
const user = require('../resources/User');
const generateURL = require('../resources/BucketUrl');


// get list of friends
router.get('/getAllFriends', (req,res) => {
    const query = 'SELECT first_name, last_name, hometown, profile_photo '+ 
                'FROM users '+
                'WHERE user_id IN ( '+
                'SELECT friend_id FROM friends '+
                'WHERE user_id = 100034); ';

    pool.query( query, [user.user_id], (error, results) => {
        if (error) {
            console.log("Error getting friends " + error.code);
            res.send({});
        }

        // set urls for photos. needs to be async
        (async () => {

            for (var i = 0; i < results.length; i++) {
                const profile_url = await generateURL(results[i].profile_photo);
                results[i].profile_photo = profile_url;
            }

            res.send(results);
        })();
    });
});

// check if user is a friend
router.get('/areFriends', (req,res) => {
    var friend_id = req.query.userId;
    var query = 'SELECT friended FROM friends WHERE user_id=? AND friend_id=?;';
    var areFriends = false;

    pool.query( query, [user.user_id, friend_id], (error, results) => {
        if (error) {
            console.log("Error getting friends " + error.code);
        }
                
        var normalResults = results.map((mysqlObj, index) => {
            return Object.assign({}, mysqlObj)
        });

        if (normalResults.length > 0)
            areFriends = true;

        res.send(areFriends);
    });
});

// add friend
router.post('/addFriend', (req,res) => {
    const friend_id = req.body.friend_id;
    const query = 'INSERT INTO friends VALUES(?,?,?,?), (?,?,?,?);';
    const time = new Date();
    const friended = 1;
    var clientResponse = 'success';

    pool.query( query, [user.user_id, friend_id, time, friended, friend_id, user.user_id, time, friended],
    (error)  => {
        if (error) {
            console.log("Error Adding friend " + error.code);
            clientResponse = 'error';
        }
                    
        res.send(clientResponse);
    });

});

// remove friend
router.post('/removeFriend', (req,res) => {
    const friend_id = req.body.friend_id;
    const query = 'DELETE FROM friends WHERE user_id=? and friend_id=?';
    var clientResponse = 'success';

    pool.query( query, [friend_id, user_id], (error)  => {
        if (error) {
            console.log("Error Adding friend " + error.code);
            clientResponse = 'error';
        }
    });

    pool.query( query, [user.user_id, friend_id], (error)  => {
        if (error) {
            console.log("Error Adding friend " + error.code);
            clientResponse = 'error';
        }
                        
        res.send(clientResponse);
    });
});

// friend reccomendation
router.get('/reccomendedFriends', (req,res) => {
    const query = 'SELECT user_id, username, first_name, last_name, profile_photo ' +
                'FROM users '+
                'WHERE user_id IN '+
                '(SELECT friend_id FROM friends WHERE user_id IN '+
                '(SELECT friend_id FROM friends friends '+
                'WHERE friends.user_id = ?)) '+
                'AND user_id != ? AND user_id NOT IN '+
                '(SELECT friend_id FROM friends WHERE user_id = ?) LIMIT 5;'

    pool.query( query, [user.user_id,user.user_id, user.user_id], (error, results)  => {
            
        if (error) {
            console.log("Error getting reccomended friends" + error.code);
            res.send({});
        }
                    
        var normalResults = results.map((mysqlObj, index) => {
            return Object.assign({}, mysqlObj)
        });    
        
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

// find potential friends
router.get('/getPotentialFriends', (req,res) => {
    const query = 'SELECT first_name, last_name, user_id, profile_photo FROM users ' +
        'WHERE user_id NOT IN ( ' +
        'SELECT friend_id FROM friends ' +
        'WHERE user_id = 100034) ' +
        'AND user_id != 100034;'

    pool.query(query, [user.user_id, user.user_id], (error, results) => {
        if (error) {
            console.log('error getting potential friends: ' + error)
        }


        // set urls for photos. needs to be async
        (async () => {

            for (var i = 0; i < results.length; i++) {
                const profile_url = await generateURL(results[i].profile_photo);
                results[i].profile_photo = profile_url;
            }

            res.send(results);
        })();
    });
});


module.exports = router;