var express = require('express');
var User = require('./../models/user');
var Company = require('./../models/company');
var Location = require('./../models/location');
var Terminal = require('./../models/terminal');
var locale = require('./../misc/locale');
var config = require('./../misc/config');
var dict = locale[config.locale];
var log = require('npmlog');
var globals = require('./../misc/globals')

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
 * Get terminals - redirect to companies
 */

router.get('/', (req, res, next)=>{
    return res.redirect('/companies');
});

/*
 * Create terminal
 */

router.get('/create', (req, res, next)=> {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    var cid = req.query.company;

    Company.getExtendedById(cid, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+":"+err.code;
            res.redirect('/companies');
            return;
        }
        if (rows.length === 0) {
            req.session.error = dict.messages.company_not_found;
            res.redirect('/companies');
            return;
        }
        var company = rows[0];
        User.getForParent(company.owner, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.code;
                res.redirect('/companies');
                return;
            }

            var discountTypes = [
                {code: 'pass', name: dict.labels.label_pass},
                {code: 'discount', name: dict.labels.label_discount},
            ];

            return res.render('terminal/create', {
                pageType: 'terminals',
                dict: dict,
                company: company,
                users: rows,
                discounts: discountTypes,
                account: req.session.user,
                message: session_message,
                error: session_error,
                errors: session_validate_error
            });

        })

    });

});

router.post('/create', (req, res, next)=> {

    req.checkBody('name', dict.messages.company_name_required).notEmpty();
    req.checkBody('type', dict.messages.country_name_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/terminals/create/?company='+req.body.company);
        return;
    }
    Terminal.create(req.body, (err, rows)=>{
        if (err) {
            console.log(err);
            req.session.error = dict.messages.db_error+":"+err.message;
            res.redirect('/terminals/create/?company='+req.body.company);
            return;
        }
        if (rows.affectedRows == 0) {
            req.session.error = dict.messages.terminal_create_error;
            res.redirect('/terminals/create/?company='+req.body.company);
        } else {
            req.session.message = dict.messages.terminal_created;
            return res.redirect('/companies');
        }
    })

});


module.exports = router;
