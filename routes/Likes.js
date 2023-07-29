const express = require("express");
const router = express.Router();
const pool = require('../resources/Database');
const user = require('../resources/User');

// get all of the photos that the user has liked
router.get('/getLikedPhotos', (req,res) => {
    query = ' SELECT photo_id FROM likes WHERE like_owner_id = ?;';

    pool.query( query, [user.user_id], (error, results) => {
        if (error) {
            console.log('error getting liked photos: ' + error);
            res.send({});
        }console.log(results[0]);

        res.send(results);
    });
});

// like or unlike a photo 
router.post('/likePhoto', (req, res) => {
    const photo_id = req.body.photoId;
    var clientResponse = 'success';
    const query = 'INSERT INTO likes VALUES(?,?)';

    pool.query( query, [photo_id, user.user_id], (error, results) => {
        if (error) {
            console.log('error liking photo :' + error.code);
            clientResponse = 'error';
        }

        res.send(clientResponse);
    });

});

// unlike a photo 
router.post('/unlikePhoto', (req, res) => {
    const photo_id = req.body.photoId;
    var clientResponse = 'success';
    const query = 'DELETE FROM likes WHERE photo_id = ? AND like_owner_id = ?';

    pool.query( query, [photo_id, user.user_id], (error) => {
        if (error) {
            console.log('error unliking photo: ' + error.code);
            clientResponse = 'error';
        }

        res.send(clientResponse);
    });
});


module.exports = router; 
