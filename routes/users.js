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


/* GET users listing. */
router.get('/', function(req, res, next) {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;

    User.getForParent(req.session.user.id, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+":"+err.message;
            res.redirect('/users');
            return;
        }

        if (req.session.user.role === 'super') {
            var resultRows = [];
            var length = rows.length;
            var count = 0;

            if (!rows.length) {
                return res.render('user/list', {
                    pageType: 'users',
                    dict: dict,
                    account: req.session.user,
                    message: session_message,
                    error: session_error,
                    items: rows
                });
            }
            rows.forEach((row, index)=>{
                var resRow = row;
                resRow.children = [];
                User.getForParent(resRow.id, (err, rows)=>{
                    count++;

                    if (err) {
                        req.session.error = dict.messages.db_error+":"+err.message;
                        res.redirect('/users');
                        return;
                    }
                    resRow.children = rows;
                    resultRows.push(resRow);

                    if (count == length) {
                        return res.render('user/list', {
                            pageType: 'users',
                            dict: dict,
                            account: req.session.user,
                            message: session_message,
                            error: session_error,
                            items: resultRows
                        });

                    }

                })

            })
        } else {
            return res.render('user/list', {
                pageType: 'users',
                dict: dict,
                account: req.session.user,
                message: session_message,
                error: session_error,
                items: rows
            });

        }

    })

});

//create

router.get('/create', function(req, res, next) {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;

    if (req.session.user.role == 'super') {

        User.getForParentRole(req.session.user.id, 'admin', (err, rows)=>{
            if (err) {
                req.session.error = dict.messages['db_error']+":"+err.code;
                res.redirect('/users');
                return;
            }
            return res.render('user/create', {
                pageType: 'users',
                dict: dict,
                adminlist: rows,
                account: req.session.user,
            });

        })
    } else {

        Company.getCompaniesTerminals(req.session.user.id, (err, rows)=>{
            if(err) {
                req.session.error = dict.messages['db_error']+":"+err.code;
                res.redirect('/users');
                return;
            }
            return res.render('user/create', {
                pageType: 'users',
                dict: dict,
                companies: rows,
                account: req.session.user,
            });
        });

    }

});
//create user
router.post('/create', function(req, res, next) {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;

    req.checkBody('name', dict.messages.name_required).notEmpty();
    req.checkBody('last', dict.messages.last_required).notEmpty();
    req.checkBody('email', dict.messages.email_required).notEmpty();
    req.checkBody('email', dict.messages.email_not_valid).isEmail();
    req.checkBody('password', dict.messages.password_required).notEmpty();
    //req.checkBody('parent', dict.messages.password_required).notEmpty();
    req.checkBody('confirmPassword', dict.messages.password_not_match).equals(req.body.password);

    var errors = req.validationErrors();

    if (req.session.user.role == 'super') {

        User.getForParentRole(req.session.user.id, 'admin', (err, rows)=>{
            if (err) {
                req.session.error = dict.messages['db_error']+":"+err.code;
                res.redirect('/users');
                return;
            }

            if (errors) {
                return res.render('user/create', {
                    pageType: 'users',
                    dict: dict,
                    adminlist: rows,
                    account: req.session.user,
                    errors: errors,
                });
            }
            bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
                //save to db
                User.createUser(req.body, bcryptedPassword, function(err, row){
                    if (err) {
                        return res.render('user/create', {
                            pageType: 'users',
                            dict: dict,
                            adminlist: rows,
                            errors: [{msg:"User create error"}]
                        });
                    } else {
                        if (row.affectedRows == 0) {
                            return res.render('user/createuser', {
                                pageType: 'users',
                                dict: dict,
                                adminlist: rows,
                                errors: [{msg:"User with email '" +req.body.email+"' already exists"}]
                            });
                        } else {
                            req.session.message = dict.messages.user_created;
                            return res.redirect('/users');
                        }
                    }
                })

            });
        })
    } else {

        if (errors) {
            return res.render('user/create', {
                pageType: 'users',
                dict: dict,
                account: req.session.user,
                errors: errors
            });
        }
        bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
            //save to db
            User.createUser(req.body, bcryptedPassword, function(err, row){
                if (err) {
                    return res.render('user/create', {
                        pageType: 'users',
                        dict: dict,
                        account: req.session.user,
                        errors: [{msg:"User create error"}]
                    });
                } else {
                    if (row.affectedRows == 0) {
                        return res.render('user/create', {
                            pageType: 'users',
                            dict: dict,
                            account: req.session.user,
                            errors: [{msg:"User with email '" +req.body.email+"' already exists"}]
                        });
                    } else {
                        req.session.message = dict.messages.user_created;
                        return res.redirect('/users');
                    }
                }
            })

        });
    }

});

/*
 * delete
 */

router.delete('/delete/:id', function(req, res, next) {

    var delid = req.params.id;

    var sessionData = req.session;
    var user = sessionData.user;
    var role = sessionData.user.role;

    var roles = role === 'super' ? 'admin' : 'cashier';
    var id = req.session.user.id;

    User.delete(delid, function(err, rows) {
        if (err) {
            req.session.error = 'Delete error: '+err;
        } else {
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

router.get('/edit/:id', function(req, res, next) {

    User.getById(req.params.id, function(err, rows){
        if (err) {
            return res.render('user/list', {
                pageType: 'users',
                dict: dict,
                account: req.session.user,
                errors: [{msg:dict.messages.db_error+err.code}]
            });
        } else {
            if (rows.length == 0) {
                return res.render('user/list', {
                    pageType: 'users',
                    dict: dict,
                    account: req.session.user,
                    errors: [{msg:dict.messages.user_not_found}]
                });
            } else {
                return res.render('user/edit', {
                    pageType: 'users',
                    dict: dict,
                    account: req.session.user,
                    subtitle: rows[0].name+' '+rows[0].last,
                    user: rows[0]
                });
            }

        }
    });


});

router.put('/edit/:id', function(req, res, next) {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;

    req.checkBody('name', dict.messages.name_required).notEmpty();
    req.checkBody('last', dict.messages.last_required).notEmpty();
    req.checkBody('email', dict.messages.email_required).notEmpty();
    req.checkBody('email', dict.messages.email_not_valid).isEmail();
    //req.checkBody('password', dict.messages.password_required).notEmpty();
    req.checkBody('parent', dict.messages.password_required).notEmpty();
    req.checkBody('confirmPassword', dict.messages.password_not_match).equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        return res.render('user/edit', {
            pageType: 'users',
            dict: dict,
            account: req.session.user,
            user: req.body,
            errors: errors
        });
    }

    if (req.body.password) {
        bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
            //save to db
            User.updateUser(req.body, bcryptedPassword, function(err, result){
                if (err) {
                    return res.render('user/edit', {
                        pageType: 'users',
                        dict: dict,
                        account: req.session.user,
                        user: req.body,
                        errors: [{msg:dict.messages.user_edit_error+": "+err.sqlMessage}]
                    });
                } else {
                    if (result == 0) {
                        return res.render('user/edit', {
                            pageType: 'users',
                            dict: dict,
                            account: req.session.user,
                            user: req.body,
                            errors: [{msg:dict.messages.user_edit_error}]
                        });
                    } else {
                        req.session.message = dict.messages.user_updated;
                        return res.redirect('/users');
                    }
                }
            })

        });
    } else {
        User.updateUser(req.body, null, function(err, result){
            if (err) {
                return res.render('user/edit', {
                    pageType: 'users',
                    dict: dict,
                    account: req.session.user,
                    user: req.body,
                    errors: [{msg:dict.messages.user_edit_error+": "+err.sqlMessage}]
                });
            } else {
                if (result == 0) {
                    return res.render('user/edit', {
                        pageType: 'users',
                        dict: dict,
                        account: req.session.user,
                        user: req.body,
                        errors: [{msg:dict.messages.user_edit_error}]
                    });
                } else {
                    req.session.message = dict.messages.user_updated;
                    return res.redirect('/users');
                }
            }
        })
    }
});

/*
 * Profile
 */

router.get('/profile', function(req, res, next) {

    return res.render('user/profile', {
        pageType: 'users',
        dict: dict,
        account: req.session.user,
        user: req.session.user,
    });

});

router.put('/profile', function(req, res, next) {

    req.checkBody('name', dict.messages.name_required).notEmpty();
    req.checkBody('last', dict.messages.last_required).notEmpty();
    req.checkBody('email', dict.messages.email_required).notEmpty();
    req.checkBody('email', dict.messages.email_not_valid).isEmail();
    //req.checkBody('password', dict.messages.password_required).notEmpty();
    req.checkBody('parent', dict.messages.password_required).notEmpty();
    req.checkBody('confirmPassword', dict.messages.password_not_match).equals(req.body.password);

    var errors = req.validationErrors();

    var errors = req.validationErrors();

    if (errors) {
        return res.render('user/profile', {
            pageType: 'users',
            dict: dict,
            account: req.session.user,
            user: req.session.user,
            errors: errors
        });
    }

    if (req.body.password) {
        bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
            //save to db
            User.updateUser(req.body, bcryptedPassword, function(err, result){
                if (err) {
                    return res.render('user/profile', {
                        pageType: 'users',
                        dict: dict,
                        account: req.session.user,
                        user: req.session.user,
                        errors: [{msg:dict.messages.profile_edit_error+": "+err.sqlMessage}]
                    });
                } else {
                    if (result == 0) {
                        return res.render('user/profile', {
                            pageType: 'users',
                            dict: dict,
                            account: req.session.user,
                            user: req.session.user,
                            errors: [{msg:dict.messages.profile_edit_error}]
                        });
                    } else {
                        User.getById(req.session.user.id, (err, rows)=>{
                            if (err) {
                                return res.render('user/profile', {
                                    pageType: 'users',
                                    dict: dict,
                                    account: req.session.user,
                                    user: req.body,
                                    errors: [{msg:dict.messages.profile_edit_error+": "+err.sqlMessage}]
                                });
                            }
                            req.session.user = rows[0];
                            req.session.message = dict.messages.profile_updated;
                            return res.redirect('/users');
                        });
                    }
                }
            })

        });
    } else {
        User.updateUser(req.body, null, function(err, result){
            if (err) {
                return res.render('user/profile', {
                    pageType: 'users',
                    dict: dict,
                    account: req.session.user,
                    user: req.body,
                    errors: [{msg:dict.messages.profile_edit_error+": "+err.sqlMessage}]
                });
            } else {
                if (result == 0) {
                    return res.render('user/profile', {
                        pageType: 'users',
                        dict: dict,
                        account: req.session.user,
                        user: req.body,
                        errors: [{msg:dict.messages.profile_edit_error}]
                    });
                } else {

                    User.getById(req.session.user.id, (err, rows)=>{
                        if (err) {
                            return res.render('user/profile', {
                                pageType: 'users',
                                dict: dict,
                                account: req.session.user,
                                user: req.body,
                                errors: [{msg:dict.messages.profile_edit_error+": "+err.sqlMessage}]
                            });
                        }
                        req.session.user = rows[0];
                        req.session.message = dict.messages.profile_updated;
                        return res.redirect('/users');
                    });
                }
            }
        })
    }

});


module.exports = router;
