var express = require('express');

var router = express.Router();

var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

var config = require('./../../misc/config')
var User = require('./../../models/user');
var Card = require('./../../models/card');
var locale = require('./../../misc/locale');
var dict = locale[config.locale];

var checkCard = (req, res, next) => {
    Card.checkAvailableCards((err, rows)=>{
        if (err) {
            return res.status(500).json({success: false, message:err.message});
        }
        if (rows.count === 0) {
            return res.status(404).json({success: false, message:'No cards available'});
        }
        next();
    });
};


router.get('/', (req, res, next)=>{
    return res.status(404).json({ success: false, message: 'Method not allowed' });
});


router.post('/', checkCard, (req, res, next)=> {

    if (!req.body.softcode) {
        return res.status(500).json({success: false, message:'Parameters missing'});
    }

    bcrypt.hash(req.body.softcode, 5, function( err, bcryptedPassword) {

        var body = req.body;
        body.cryptPwd = bcryptedPassword;
        console.log(body);

        User.createSoftUser(body, (err, rows)=>{
            if (err) {
                return res.status(500).json({success: false, message:err.message});
            }
            if (rows.affectedRows === 0) {
                return res.status(404).json({success: false, message:'User already exists'});
            }

            var userId = rows.insertId;
            var body = {user: userId};
            //TODO implement company id

            Card.assignSoftCard(body, (err, rows)=>{
                if (err) {
                    return res.status(500).json({success: false, message:err.message});
                }
                if (rows.affectedRows === 0) {
                    return res.status(404).json({success: false, message:'Error assigning card'});
                }

                var payload = {
                    id: userId,
                    email: req.body.softcode,
                    role: 'customer'
                };
                var token = jwt.sign(payload, config.secret, {
                    expiresIn: config.tokenExpireIn
                });

                res.status(200).json({
                    success: true,
                    message: 'successfully registered',
                    softcode: req.body.softcode,
                    token: token
                });

            })

        })
    })


});

module.exports = router;
