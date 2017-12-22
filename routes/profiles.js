var express = require('express');
var User = require('./../models/user');
var Company = require('./../models/company');
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

router.use(function(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/signin');
    } else {
        next();
    }
});

/*
 * Profile
 */

router.get('/', function(req, res, next) {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    return res.render('user/profile', {
        pageType: 'users',
        dict: dict,
        account: req.session.user,
        user: req.session.user,
        message: session_message,
        error: session_error,
        errors: session_validate_error
    });

});

router.put('/', function(req, res, next) {

    req.checkBody('name', dict.messages.name_required).notEmpty();
    req.checkBody('last', dict.messages.last_required).notEmpty();
    req.checkBody('email', dict.messages.email_required).notEmpty();
    req.checkBody('email', dict.messages.email_not_valid).isEmail();
    //req.checkBody('password', dict.messages.password_required).notEmpty();
    req.checkBody('parent', dict.messages.password_required).notEmpty();
    req.checkBody('confirmPassword', dict.messages.password_not_match).equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/profile');
        return;
    }

    if (req.body.password) {
        bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
            //save to db
            User.updateUser(req.body, bcryptedPassword, function(err, rows){
                if (err) {
                    req.session.error = dict.messages.db_error+": "+err.message;
                    return res.redirect('/profile');
                }
                if (rows.affectedRows == 0) {
                    req.session.error = dict.messages.profile_edit_error;
                    return res.redirect('/profile');
                }
                req.session.message = dict.messages.profile_updated;
                return res.redirect('/companies');
            })

        });
    } else {
        User.updateUser(req.body, null, function(err, rows){
            if (err) {
                req.session.error = dict.messages.db_error+": "+err.message;
                return res.redirect('/profile');
            }
            if (rows.affectedRows == 0) {
                req.session.error = dict.messages.profile_edit_error;
                return res.redirect('/profile');
            }
            User.getById(req.session.user.id, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+": "+err.message;
                    return res.redirect('/profile');
                }
                req.session.user = rows[0];
                req.session.message = dict.messages.profile_updated;
                return res.redirect('/companies');
            });

        })
    }

});


module.exports = router;
