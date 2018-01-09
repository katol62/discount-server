var express = require('express');

var router = express.Router();

var config = require('./../../misc/config')
var User = require('./../../models/user');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var locale = require('./../../misc/locale');
var dict = locale[config.locale];

router.post('/', function(req, res, next) {

    if (req.body.email && req.body.password) {
        User.find(req.body.email, function(err, row) {
            if (err) {
                console.log(err);
                return res.status(500).json({ errors: [dict.messages.db_error+": "+err.message, err.body] });
            } else {
                if (row.length == 0) {
                    return res.status(404).json({ errors: [dict.messages.user_not_found] });
                } else {
                    var hash = row[0]['password'];
                    bcrypt.compare(req.body.password, hash, function(err, doesMatch){
                        if (doesMatch){
                            var user = row[0];
                            var payload = {
                                admin: user.email,
                                role: user.role
                            };
                            var token = jwt.sign(payload, config.secret, {
                                expiresIn: 86400 // expires in 24 hours
                            });

                            res.json({
                                success: true,
                                message: 'Enjoy your token!',
                                token: token
                            });
                        }else{
                            return res.status(404).json({ errors: [dict.messages.password_invalid] });
                        }
                    });
                }
            }
        })
    } else {
        return res.status(400).json({error: req.query});
    }

});

module.exports = router;
