var express = require('express');
var User = require('./../models/user');
var Card = require('./../models/card');
var bcrypt = require('bcrypt');
var locale = require('./../misc/locale');
var config = require('./../misc/config');
var dict = locale[config.locale];
var log = require('npmlog');

var router = express.Router();

var methodOverride = require('method-override');
router.use(methodOverride('X-HTTP-Method-Override'));
router.use(methodOverride('_method'));

router.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        var method = req.body._method;
        delete req.body._method;
        return method;
    }
}));

router.use((req, res, next)=> {
    if (!req.session.user || req.session.user.role === 'cashier') {
        return res.redirect('/signin');
    } else {
        next();
    }
});

router.get('/', (req, res, next)=>{
    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    var offset = req.params.start ? req.params.start : 1;
    var limit = 10;

    Card.getAll(limit, offset, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+":"+err.message;
            return res.redirect('/cards');
        }

        return res.render('card/list', {
            pageType: 'cards',
            dict: dict,
            account: req.session.user,
            message: session_message,
            error: session_error,
            items: rows
        });

    });


});

module.exports = router;
