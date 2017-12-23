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
    if (!req.session.user || req.session.user.role !== 'super') {
        return res.redirect('/signin');
    } else {
        next();
    }
});

/* GET users listing. */
router.get('/', function(req, res, next) {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    User.getForParent(req.session.user.id, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+":"+err.message;
            res.redirect('/users');
            return;
        }

        return res.render('admin/list', {
            pageType: 'admins',
            dict: dict,
            account: req.session.user,
            message: session_message,
            error: session_error,
            items: rows
        });

    })

});

/*
 * Create admin
 */

router.get('/create', function(req, res, next) {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    return res.render('admin/create', {
        pageType: 'admins',
        dict: dict,
        account: req.session.user,
        message: session_message,
        error: session_error,
        errors: session_validate_error,
    });

});

router.post('/create', function(req, res, next) {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    req.checkBody('name', dict.messages.name_required).notEmpty();
    req.checkBody('last', dict.messages.last_required).notEmpty();
    req.checkBody('email', dict.messages.email_required).notEmpty();
    req.checkBody('email', dict.messages.email_not_valid).isEmail();
    req.checkBody('password', dict.messages.password_required).notEmpty();
    req.checkBody('confirmPassword', dict.messages.password_not_match).equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/admins/create');
        return;
    }

    bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
        //save to db
        User.createUser(req.body, bcryptedPassword, function(err, row){
            if (err) {
                req.session.error = err;
                res.redirect('/admins/create');
                return;
            } else {
                if (row.affectedRows == 0) {
                    req.session.error = dict.messages.db_error;
                    res.redirect('/admins/create');
                    return;
                } else {
                    req.session.message = dict.messages.user_created;
                    return res.redirect('/admins');
                }
            }
        })

    });

});

/*
 * Delete admin
 */

router.delete('/:id/delete', function(req, res, next) {

    var delid = req.params.id;

    User.deleteAdmin(req.params.id, (err, rows)=> {
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
        } else {
            console.log(rows);

            if (rows.affectedRows) {
                req.session.message = dict.messages.user_deleted;
            } else {
                req.session.error = dict.messages.user_not_deleted;
            }
        }
        return res.status(200).send('ok');
    });

});

/*
 * Edit
 */

router.get('/:id/edit', function(req, res, next) {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    User.getById(req.params.id, function(err, rows){
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/admins');
        } else {
            if (rows.length == 0) {
                req.session.error = dict.messages.user_not_found;
                res.redirect('/admins');
            } else {
                return res.render('admin/edit', {
                    pageType: 'admins',
                    dict: dict,
                    account: req.session.user,
                    subtitle: rows[0].name+' '+rows[0].last,
                    user: rows[0],
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error,
                });
            }

        }
    });
});

router.put('/:id/edit', function(req, res, next) {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

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
        res.redirect('/admins/'+req.body.id+'/edit');
        return;
    }

    if (req.body.password) {
        bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
            //save to db
            User.updateUser(req.body, bcryptedPassword, function(err, result){
                if (err) {
                    req.session.error = dict.messages.user_edit_error+": "+err.message;
                    res.redirect('/admins/'+req.body.id+'/edit');
                    return;
                } else {
                    if (result.affectedRows == 0) {
                        req.session.error = dict.messages.user_edit_error;
                    } else {
                        req.session.message = dict.messages.user_updated;
                    }
                    return res.redirect('/admins');
                }
            })

        });
    } else {
        User.updateUser(req.body, null, function(err, result){
            if (err) {
                req.session.error = dict.messages.user_edit_error+": "+err.sqlMessage;
                return res.redirect('/admins/edit/'+req.body.id);
            }
            if (result.affectedRows == 0) {
                req.session.error = dict.messages.user_edit_error;
            } else {
                req.session.message = dict.messages.user_updated;
            }
            return res.redirect('/admins');
        })
    }
});

module.exports = router;
