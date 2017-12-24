var express = require('express');
var User = require('./../models/user');
var Card = require('./../models/card');
var bcrypt = require('bcrypt');
var locale = require('./../misc/locale');
var config = require('./../misc/config');
var dict = locale[config.locale];
var log = require('npmlog');
var md5 = require('md5');
var globals = require('./../misc/globals');

var generateCardNumber = (id, tid, ai)=> {
    var zero = '0000000000000000';
    var bareOid = Number(id)+'';
    var limitOid = 6;
    var bareTid = Number(tid)+'';
    var limitTid = 4;
    var bareCard = ai+'';
    var limitCard = 6;

    var nb_oid = zero.substr(bareOid.length, limitOid-bareOid.length)+bareOid;
    var nb_tid = zero.substr(bareTid.length, limitTid-bareTid.length)+bareTid;
    var nb_nbr = zero.substr(bareCard.length, limitCard-bareCard.length)+bareCard;

    var card_number = nb_oid+nb_tid+nb_nbr;
    return card_number;
};

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

    var offset = req.params.start ? req.params.start : 0;
    var limit = 10;

    Card.getAll(limit, offset, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+":"+err.message;
            return res.redirect('/cards');
        }
        console.log(rows);
        if (rows.length === 0) {
            rows = [];
            return res.render('card/list', {
                pageType: 'cards',
                dict: dict,
                account: req.session.user,
                message: session_message,
                error: session_error,
                items: rows
            });
        }
        var finalRows = [];
        var count = 0;
        var length = rows.length;

        rows.forEach((row, index)=>{
            count++
            var finalRow = row;
            console.log(row.type);
            console.log(row.status);
            finalRow.typeName = globals.methods.nameById(row.type, config.tariffTypes);
            finalRow.statusName = globals.methods.nameById(row.status, config.cardStatus);
            finalRows.push(finalRow);
            if (count >= rows.length) {
                return res.render('card/list', {
                    pageType: 'cards',
                    dict: dict,
                    account: req.session.user,
                    message: session_message,
                    error: session_error,
                    items: finalRows
                });

            }
        });

    });
});

/*
 * Get auto increment
 */

router.post('/ai', (req, res, next)=>{

});


/*
 * Create card
 */

router.get('/create', (req, res, next)=> {
    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    var statuses = config.cardStatus;
    var types = config.tariffTypes;

    return res.render('card/create', {
        pageType: 'cards',
        dict: dict,
        account: req.session.user,
        types: types,
        statuses: statuses,
        message: session_message,
        error: session_error,
        errors: session_validate_error
    });
});

router.post('/create', (req, res, next)=> {
    req.checkBody('lifetime', dict.messages.card_lifetime_required).notEmpty();
    req.checkBody('servicetime', dict.messages.card_servicetime_required).notEmpty();
    req.checkBody('type', dict.messages.card_type_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/cards/create');
        return;
    }

    Card.getAutoIncrement((err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/cards');
            return;
        }
        var ai = rows[0].ai;
        var card_number = generateCardNumber(req.session.user.id, Number(req.body.codetype), ai);
        var qr_code = md5(card_number);

        console.log(card_number+" "+qr_code);
        var body = {card_nb: card_number, qr_code: qr_code, type: req.body.type, status: 'published', lifetime: req.body.lifetime, servicetime: req.body.servicetime, test: req.body.test};
        Card.createCard(body, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+": "+err.message;
                res.redirect('/cards/create');
                return;
            }
            if (rows.affectedRows===0) {
                req.session.error = dict.messages.card_create_error;
                res.redirect('/cards');
                return;
            }
            req.session.message = dict.messages.card_created+": "+card_number;
            res.redirect('/cards');
        })

    })

});

/*
 * Edit card
 */

router.get('/:id/edit', (req, res, next)=>{
    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Card.getById(req.params.id, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/cards/'+req.params.id+'/edit');
            return;
        }
        if (rows.length === 0) {
            req.session.error = dict.messages.card_not_found;
            res.redirect('/cards');
            return;
        }
        var card = rows[0];
        var code = globals.methods.getCodeType(card.card_nb);
        card.codetype = code;

        var statuses = config.cardStatus;
        var types = config.tariffTypes;

        return res.render('card/edit', {
            pageType: 'cards',
            dict: dict,
            account: req.session.user,
            types: types,
            card: card,
            statuses: statuses,
            message: session_message,
            error: session_error,
            errors: session_validate_error
        });
    })
});

router.put('/:id/edit', (req, res, next)=> {

    req.checkBody('lifetime', dict.messages.card_lifetime_required).notEmpty();
    req.checkBody('servicetime', dict.messages.card_servicetime_required).notEmpty();
    req.checkBody('type', dict.messages.card_type_required).notEmpty();
    req.checkBody('status', dict.messages.card_status_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/cards/'+req.body.id+'/edit');
        return;
    }

    Card.updateCard(req.body, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/cards/'+req.params.id+'/edit');
            return;
        }
        if (rows.affectedRows === 0) {
            req.session.error = dict.messages.card_update_error;
            res.redirect('/cards/'+req.params.id+'/edit');
            return;
        }
        req.session.message = dict.messages.card_updated;
        res.redirect('/cards');

    })

});

/*
 * Delete card
 */

router.delete('/:id/delete', function(req, res, next) {

    Card.delete(req.params.id, (err, rows)=> {
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
        } else {
            if (rows.affectedRows) {
                req.session.message = dict.messages.card_deleted;
            } else {
                req.session.error = dict.messages.card_not_deleted;
            }
        }
        return res.status(200).send('ok');
    });

});


module.exports = router;
