var express = require('express');
var api = express();

var auth = require('./apiauth');
var cards = require('./apicard');
var register = require('./apiregister');
var config = require('./../../misc/config');

var jwt = require('jsonwebtoken');
var locale = require('./../../misc/locale');
var dict = locale[config.locale];

var checkToken = (req, res, next) => {
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
        return res.status(403).send({
            success: false,
            message: 'Token missed'
        });

    }
};

api.get('/', (req, res, next)=>{
    return res.status(404).json({ success: false, message: 'Not allowed' });
});

api.post('/', (req, res, next)=>{
    return res.status(404).json({ success: false, message: 'Not allowed' });
});

api.use('/auth', auth);
api.use('/register', register);
api.use('/cards', checkToken, cards);

api.use(function (req, res, next) {
    res.status(404).json({ success: false, message: 'Not found' });
});

api.use(function (err, req, res, next) {
    res.status(err.status || 500).json({status:'error', message:(err.message?err.message:'Unknown error')});
});

module.exports = api;
