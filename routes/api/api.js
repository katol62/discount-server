var express = require('express');
var api = express();

var auth = require('./apiauth');
var cards = require('./apicard');
var config = require('./../../misc/config');

var jwt = require('jsonwebtoken');
var locale = require('./../../misc/locale');
var dict = locale[config.locale];

api.use('/auth', auth);
api.use('/cards', cards);

api.use(function(req, res, next) {

    // check header or url parameters or post parameters for token
    var token = req.body.token || req.param('token') || req.headers['x-access-token'];

    // decode token
    if (token) {

        // verifies secret and checks exp
        jwt.verify(token, app.get('superSecret'), function(err, decoded) {
            if (err) {
                return res.json({ success: false, message: dict.messages.token_invalid });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });

    } else {

        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: dict.messages.token_missed
        });

    }

});

module.exports = api;
