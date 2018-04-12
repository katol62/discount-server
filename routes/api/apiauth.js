var express = require('express');

var router = express.Router();

var config = require('./../../misc/config');
var User = require('./../../models/user');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var locale = require('./../../misc/locale');
var dict = locale[config.locale];

router.get('/', (req, res, next)=>{
    return res.status(404).json({ success: false, message: 'Method not allowed' });
});

router.post('/', function(req, res, next) {

    if ((req.body.email && req.body.password) || (req.body.softcode && req.body.type && req.body.type=='customer') ) {
        var email, password;
        if (req.body.email && req.body.password) {
            email = req.body.email;
            password = req.body.password;
        } else {
            email = req.body.softcode;
            password = req.body.softcode;
        }

        User.find(email, function(err, row) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message});
            } else {
                if (row.length == 0) {
                    return res.status(404).json({ success: false, message: 'User not found' });
                } else {
                    var hash = row[0]['password'];
                    bcrypt.compare(password, hash, function(err, doesMatch){
                        if (doesMatch){
                            var user = row[0];
                            var payload = {
                                id: user.id,
                                email: user.email,
                                role: user.role
                            };
                            var token = jwt.sign(payload, config.secret, {
                                expiresIn: config.tokenExpireIn
                            });

                            res.status(200).json({
                                success: true,
                                message: 'valid token',
                                token: token
                            });
                        }else{
                            return res.status(404).json({ success: false, message: 'Invalid password' });
                        }
                    });
                }
            }
        })
    } else {
        return res.status(400).json({error: 'Missing parameters'});
    }

});

module.exports = router;
