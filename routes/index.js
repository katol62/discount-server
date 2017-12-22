var express = require('express');
var router = express.Router();
var User = require('./../models/user');
var bcrypt = require('bcrypt');
var log = require('npmlog');
var locale = require('./../misc/locale');
var config = require('./../misc/config');
var dict = locale[config.locale];

/* GET home page. */
router.get('/', function (req, res, next) {
    var user = req.session.user ? req.session.user : null;
    res.render('index', {
        pageType: 'home',
        dict: dict,
        account: user
    });
});

/* signout page. */
router.get('/signout', function (req, res, next) {
    req.session.destroy(function(err) {
        if(err) {
            console.log(err);
        } else {
            res.redirect('/');
        }
    });
});

/* GET signin page. */
router.get('/signin', function(req, res, next) {
    res.render('signin', {
        pageType: 'signin',
        dict: dict,
    });
});

router.post('/signin', function(req, res, next){

    //Check that the name field is not empty
    req.checkBody('email', locale[config.locale].messages.email_required).notEmpty();
    req.checkBody('email', locale[config.locale].messages.email_not_valid).isEmail();
    req.checkBody('password', locale[config.locale].messages.password_required).notEmpty();

    req.sanitize('email').escape();
    req.sanitize('email').trim();

    var errors = req.validationErrors();
    console.log(errors);

    var sessionData = req.session;

    if (errors) {
        //If there are errors render the form again, passing the previously entered values and errors
        return res.render('signin', {
            pageType: 'signin',
            dict: dict,
            errors: errors
        });
    } else {

        User.find(req.body.email, function(err, row) {
            if (err) {
                req.session.user = null;
                return res.render('signin', {
                    pageType: 'signin',
                    dict: dict,
                    errors: [{msg: dict.messages['db_error']+":"+err.code}]
                });
            } else {
                if (row.length == 0) {
                    sessionData.user = null;
                    return res.render('signin', {
                        pageType: 'signin',
                        dict: dict,
                        errors: [{msg: dict.messages['user_not_found']}]
                    });
                } else {

                    var hash = row[0]['password'];
                    bcrypt.compare(req.body.password, hash, function(err, doesMatch){
                        if (doesMatch){
                            //log him in
                            req.session.user = row[0];
                            return res.redirect('/companies');
                        }else{
                            //go away
                            return res.render('signin', {
                                pageType: 'signin',
                                dict: dict,
                                errors: [{msg: dict.messages['password_invalid']}]
                            });
                        }
                    });
                }
            }
        })
    }

});


module.exports = router;
