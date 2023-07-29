const express = require("express");
const router = express.Router();
const pool = require('../resources/Database');
const user = require('../resources/User');

// create album
router.post('/createAlbum', (req,res) => {
    const album_name = req.body.albumName;
    const query = 'INSERT INTO albums (album_owner_id, name, date) VALUES (?,?,?);';
    var clientResponse = 'success';
    var time = new Date();

    pool.query( query, [user.user_id, album_name, time], (error) => {
        
        if (error) {
            console.log('Error creating album ' + error.code);
            clientResponse = error;
        }
    
        res.send(clientResponse);
    });
});


module.exports = router;