var express = require('express');
var User = require('./../models/user');
var Card = require('./../models/card');
var Company = require('./../models/company');
var Transh = require('./../models/transh');
var bcrypt = require('bcrypt');
var locale = require('./../misc/locale');
var config = require('./../misc/config');
var dict = locale[config.locale];
var globals = require('./../misc/globals');
var fs = require('fs');
var csvjson = require('csvjson');
var formidable = require('formidable');
var md5 = require('md5');
var paginate = require('./../misc/paginate');

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
    if (!req.session.user || (req.session.user.role === 'cashier' && req.originalUrl !=='/cards/sell')) {
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

    const filter = req.query.filter ? req.query.filter : '';
    const filterValue = req.query.filterValue ? req.query.filterValue : '';
    let filterObject = {filter: filter, filterValue: filterValue};

    Card.getTotalForOwner(req.session.user, filterObject, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+":"+err.message;
            return res.redirect('/cards');
        }

        if (rows.length === 0) {
            req.session.error = dict.messages.cards_not_found;
            return res.redirect('/cards');
        }
        var total = rows[0].count;

        var limit = config.paginationLimit;
        var pageNb = req.query.page ? Number(req.query.page) : 1;
        var offset = (pageNb-1)*limit;
        var page = {offset: offset, limit: limit, page: pageNb, total: total};

        Card.getAllForUser(req.session.user, limit, offset, filterObject, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.message;
                return res.redirect('/cards');
            }
            if (rows.length === 0) {
                rows = [];
                page.pages = [];
                return res.render('card/list', {
                    pageType: 'cards',
                    dict: dict,
                    page: page,
                    account: req.session.user,
                    message: session_message,
                    error: session_error,
                    filterObject: filterObject,
                    items: rows
                });
            }
            var finalRows = [];
            var count = 0;
            var pCount = Math.ceil(total/limit);
            console.log('pCount=' + pCount+' Total: '+total+' pCount='+(total/limit));
            page.pages = [];
            for (var i=1; i<=pCount; i++) {
                page.pages.push(i);
            }
            const pages = paginate.pages(total, page.page);
            rows.forEach((row, index)=>{
                count++;
                var finalRow = row;
                finalRow.typeName = globals.methods.nameById(row.type, config.tariffTypes);
                finalRow.statusName = globals.methods.nameById(row.status, config.cardStatus);
                finalRows.push(finalRow);
                if (count >= rows.length) {
                    return res.render('card/list', {
                        pageType: 'cards',
                        dict: dict,
                        page: page,
                        pagination: pages,
                        account: req.session.user,
                        message: session_message,
                        error: session_error,
                        filters: config.filters,
                        filterObject: filterObject,
                        items: finalRows
                    });

                }
            });

        });


    });


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

    if (req.session.user.role === 'super') {
        User.getForParentRole(req.session.user.id, 'admin', (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.message;
                return res.redirect('/cards');
            }
            var admins = rows;
            var companies = [];

            Company.getCompaniesForParent(req.session.user.id, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+":"+err.message;
                    return res.redirect('/cards');
                }

                companies = rows;

                return res.render('card/create', {
                    pageType: 'cards',
                    dict: dict,
                    account: req.session.user,
                    types: types,
                    admins: admins,
                    companies: companies,
                    statuses: statuses,
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error
                });
            });

        });
    } else {
        Company.getCompaniesForOwner(req.session.user.id, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.message;
                return res.redirect('/cards');
            }
            var companies = rows;
            return res.render('card/create', {
                pageType: 'cards',
                dict: dict,
                account: req.session.user,
                types: types,
                companies: companies,
                statuses: statuses,
                message: session_message,
                error: session_error,
                errors: session_validate_error
            });
        })
    }

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

        var body = {};
        body.card_nb = card_number;
        body.qr_code = qr_code;
        body.type = req.body.type;
        body.status = 'published';
        body.lifetime = req.body.lifetime;
        body.servicetime = req.body.servicetime;
        body.company = req.body.company !='' ? req.body.company : null;
        body.transh = '0';
        body.test = req.body.test;
        body.prim = req.body.prim;
        body.owner = (req.body.admin && req.body.admin != '') ? req.body.admin : req.body.owner;

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
            req.session.error = dict.messages.db_error+": +++"+err.message;
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

        if (req.session.user.role === 'super') {
            if (card.owner == 0) {
                User.getForParentRole(req.session.user.id, 'admin', (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+": !!!"+err.message;
                        return res.redirect('/cards');
                    }
                    var admins = rows;
                    var companies = [];

                    Company.getCompaniesForParent(req.session.user.id, (err, rows)=>{
                        if (err) {
                            req.session.error = dict.messages.db_error+": ???"+err.message;
                            return res.redirect('/cards');
                        }

                        companies = rows;

                        return res.render('card/edit', {
                            pageType: 'cards',
                            dict: dict,
                            account: req.session.user,
                            types: types,
                            admins: admins,
                            card: card,
                            companies: companies,
                            statuses: statuses,
                            message: session_message,
                            error: session_error,
                            errors: session_validate_error
                        });
                    });

                });
            } else {

                User.getForParentRole(req.session.user.id, 'admin', (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+": !!!"+err.message;
                        return res.redirect('/cards');
                    }
                    var admins = rows;

                    Company.getCompaniesForOwner(card.owner, (err, rows)=>{
                        if (err) {
                            req.session.error = dict.messages.db_error+":"+err.message;
                            return res.redirect('/cards');
                        }
                        var companies = rows;

                        return res.render('card/edit', {
                            pageType: 'cards',
                            dict: dict,
                            account: req.session.user,
                            types: types,
                            card: card,
                            admins: admins,
                            companies: companies,
                            statuses: statuses,
                            message: session_message,
                            error: session_error,
                            errors: session_validate_error
                        });
                    })

                });
            }


        } else {

            Company.getCompaniesForOwner(req.session.user.id, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+":"+err.message;
                    return res.redirect('/cards');
                }
                var companies = rows;
                return res.render('card/edit', {
                    pageType: 'cards',
                    dict: dict,
                    account: req.session.user,
                    types: types,
                    card: card,
                    companies: companies,
                    statuses: statuses,
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error
                });
            })

        }

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

    var body = req.body;
    body.updatedBy = req.session.user.id;
    body.updated = require('moment')().format('YYYY-MM-DD HH:mm:ss');

    Card.updateCard(body, (err, rows)=>{
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

/*
 * Transhes
 */

router.get('/transhes', (req, res, next)=>{
    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Transh.getTotalForOwner(req.session.user, null,(err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/cards');
            return;
        }

        console.log(rows);

        let total = rows.total;
        let items = rows.items;
        console.log('TOTAL=' + total);
        console.log(items);

        return res.render('transh/list', {
            pageType: 'cards',
            dict: dict,
            account: req.session.user,
            items: items,
            message: session_message,
            error: session_error,
            errors: session_validate_error
        });

    })

});

/*
 * Create transh
 */

router.get('/transhes/create', (req, res, next)=> {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    var statuses = config.cardStatus;
    var types = config.tariffTypes;

    if (req.session.user.role === 'super') {
        User.getForParentRole(req.session.user.id, 'admin', (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.message;
                return res.redirect('/cards');
            }
            var admins = rows;
            var companies = [];

            Company.getCompaniesForParent(req.session.user.id, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+":"+err.message;
                    return res.redirect('/cards');
                }

                companies = rows;

                return res.render('transh/create', {
                    pageType: 'cards',
                    dict: dict,
                    account: req.session.user,
                    types: types,
                    admins: admins,
                    companies: companies,
                    statuses: statuses,
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error
                });
            });

        });
    } else {
        Company.getCompaniesForOwner(req.session.user.id, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.message;
                return res.redirect('/cards');
            }
            var companies = rows;
            return res.render('transh/create', {
                pageType: 'cards',
                dict: dict,
                account: req.session.user,
                types: types,
                companies: companies,
                statuses: statuses,
                message: session_message,
                error: session_error,
                errors: session_validate_error
            });
        })
    }

});

router.post('/transhes/create', (req, res, next)=> {
    req.checkBody('count', dict.messages.transh_count_required).notEmpty();
    req.checkBody('lifetime', dict.messages.card_lifetime_required).notEmpty();
    req.checkBody('servicetime', dict.messages.card_servicetime_required).notEmpty();
    req.checkBody('type', dict.messages.card_type_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/cards/transhes/create');
        return;
    }

    Card.getAutoIncrement((err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/cards/transhes');
            return;
        }
        const start = rows[0].ai;
        const count = req.body.count;
        const external = req.body.external ? req.body.external : '0';
        const owner = (req.body.admin && req.body.admin != '') ? req.body.admin : req.body.owner;

        var body = {start: start, count: count, owner: owner, external: external};

        Transh.createTransh(body, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+": "+err.message;
                return res.redirect('/cards/transhes');
            }
            if (!rows.insertId) {
                req.session.error = dict.messages.transh_create_error;
                return res.redirect('/cards/transhes');
            }
            var transh = rows.insertId;

            var finalArray = [];

            for (var i=Number(start); i<Number(start)+Number(count); i++) {
                var card_number = generateCardNumber(req.session.user.id, Number(req.body.codetype), i);
                var qr_code = md5(card_number);
                var card = [];
                card.push(qr_code);
                card.push(card_number);
                card.push(req.body.type);
                card.push('published');
                card.push(req.body.lifetime);
                card.push(req.body.servicetime);
                card.push(req.body.company !='' ? req.body.company : null);
                card.push(transh);
                card.push('0');
                card.push(owner);

                finalArray.push(card);
            }

            Card.createCardTransh(finalArray, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+": !!!"+err.message;
                    res.redirect('/cards/transhes/create');
                    return;
                }
                if (rows.affectedRows===0) {
                    req.session.error = dict.messages.transh_create_error;
                    res.redirect('/cards/transhes');
                    return;
                }
                req.session.message = dict.messages.transh_created;
                res.redirect('/cards');
            })

        });

    })

});

/*
 * Edit transh
 */

router.get('/transhes/:id/edit', (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    var statuses = config.cardStatus;
    var types = config.tariffTypes;

    Transh.getTransh(req.params.id, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+":"+err.message;
            return res.redirect('/cards/transhes');
        }
        if (rows.length === 0) {
            req.session.error = dict.messages.transh_not_found;
            return res.redirect('/cards/transhes');
        }
        var transh = rows[0];

        if (req.session.user.role === 'super') {
            User.getForParentRole(req.session.user.id, 'admin', (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+":"+err.message;
                    return res.redirect('/cards/transhes');
                }
                var admins = rows;
                var companies = [];

                Company.getCompaniesForParent(req.session.user.id, (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+":"+err.message;
                        return res.redirect('/cards/transhes');
                    }

                    companies = rows;

                    return res.render('transh/edit', {
                        pageType: 'cards',
                        dict: dict,
                        account: req.session.user,
                        types: types,
                        admins: admins,
                        transh: transh,
                        companies: companies,
                        statuses: statuses,
                        message: session_message,
                        error: session_error,
                        errors: session_validate_error
                    });
                });

            });
        } else {
            Company.getCompaniesForOwner(req.session.user.id, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+":"+err.message;
                    return res.redirect('/cards/transhes');
                }
                var companies = rows;
                return res.render('transh/edit', {
                    pageType: 'cards',
                    dict: dict,
                    account: req.session.user,
                    types: types,
                    transh: transh,
                    companies: companies,
                    statuses: statuses,
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error
                });
            })
        }

    });

});

router.put('/transhes/:id/edit', (req, res, next)=> {

    req.checkBody('lifetime', dict.messages.card_lifetime_required).notEmpty();
    req.checkBody('servicetime', dict.messages.card_servicetime_required).notEmpty();
    req.checkBody('type', dict.messages.card_type_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/cards/transhes/'+req.params.id+'/edit');
        return;
    }

    Transh.updateTransh(req.body, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/cards/transhes/'+req.params.id+'/edit');
            return;
        }

        var body = req.body;
        body.updatedBy = req.session.user.id;
        body.updated = require('moment')().format('YYYY-MM-DD HH:mm:ss');

        Card.updateCardsForTransh(body, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+": "+err.message;
                res.redirect('/cards/transhes/'+req.params.id+'/edit');
                return;
            }
            if (rows.affectedRows === 0) {
                req.session.error = dict.messages.transh_update_error;
                res.redirect('/cards/transhes/'+req.params.id+'/edit');
                return;
            }
            req.session.message = dict.messages.transh_updated;
            res.redirect('/cards/transhes');

        })
    });
});

router.put('/transhes/:id/link', (req, res, next)=> {

    const link = req.body.link;
    const partnerId = link == 'true' ? req.body.partnerId : 1;
    const transhId = req.params.id;

    console.log(req.body);
    if (!partnerId || !transhId) {
        return res.status(200).json({ success: false, message: dict.messages.missing_params});
    }

    const body = {owner: partnerId, transhId: transhId};

    Transh.updateTranshOwner(body, (err, rows, next) => {
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
        } else {
            if (rows.affectedRows) {
                req.session.message = dict.messages.transh_updated;
            } else {
                req.session.error = dict.messages.transh_update_error;
            }
        }
        return res.status(200).send('ok');
    })

});


/*
 * Delete card
 */

router.delete('/transhes/:id/delete', function(req, res, next) {

    Card.deleteCardsForTransh(req.params.id, (err, rows)=> {
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
        } else {
            if (rows.affectedRows) {
                req.session.message = dict.messages.transh_deleted;
            } else {
                req.session.error = dict.messages.transh_delete_error;
            }
        }
        return res.status(200).send('ok');
    });

});

//save cards array to csv
router.get('/transhes/:trid/tocsv', (req, res, next)=> {

    Card.getByTranshId(req.params.trid, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/cards/transhes');
            return;
        }

        var data = rows;

        var options = {
            delimiter   : ",",
            wrap        : false
        };
        var csv = csvjson.toCSV(data, options);

        console.log('++++ CSV ++++++++')
        console.log(csv)
        console.log('++++ CSV ++++++++')

        res.setHeader('Content-disposition', 'attachment; filename=transh'+req.params.trid+'.csv');
        res.set('Content-Type', 'text/csv');
        res.status(200).send(csv);

    });

});

//from csv

router.post('/fromcsv', function(req, res, next){

    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        // `file` is the name of the <input> field of type `file`
        var old_path = files.file.path;
        fs.readFile(old_path, "utf8", (err, data)=> {

            console.log(data);
            console.log(err);

            if (err) {
                req.session.error = dict.messages.db_error+": "+err.message;
                res.redirect('/cards');
                return;
            }

            var options = {
                delimiter   : ",",
                wrap        : false
            };
            var csvdata = csvjson.toArray(data, options);

            csvdata.shift();
            console.log('====== csvdata =========');
            console.log(csvdata);
            console.log('====== csvdata =========');

            Card.updateFromExternal(csvdata, function (err, rows) {
                if (err) {
                    req.session.error = dict.messages.db_error+': '+err.message;
                } else {
                    if (rows.affectedRows == 0) {
                        req.session.error = dict.messages.db_error;
                    } else {
                        req.session.message = 'Cards updated';
                    }
                }
                res.redirect('/cards');
            })

        });
    });

});

router.get('/sell', (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    console.log(session_message);
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    var types = config.tariffTypes;
    var pass = config.passType;

    return res.render('card/sell', {
        pageType: 'sell',
        dict: dict,
        account: req.session.user,
        types: types,
        passes: pass,
        message: session_message,
        error: session_error,
        errors: session_validate_error
    });

});

router.post('/sell', (req, res, nexr)=>{
    req.checkBody('card', dict.messages.visit_card_number_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/cards/sell');
        return;
    }

    Card.getByIdOrNumberForUser(req.body.card, req.session.user, (err, rows)=>{

        if (err) {
            req.session.error = dict.messages.db_error+': '+err.message;
            return res.redirect('/cards/sell');
        }
        if (rows.length == 0) {
            req.session.error = dict.messages.card_not_found_or_not_allowed;
            return res.redirect('/cards/sell');
        }

        let card = rows[0];
        var card_number = card.card_nb;
        let passCount = globals.methods.getPassLimit(card.pass);

        const overdue = card.pass_count + 1 > card.pass && card.pass_total >= Number(passCount);

        console.log(card);
        console.log('passCount:: '+passCount);
        console.log('status:: '+card.status);
        console.log('overdue:: '+overdue);

        if (rows[0].status != 'published') {
            if (!overdue) {
                req.session.error = dict.messages.card_already_sold+": "+card_number;
                return res.redirect('/cards/sell');
            }
        }

        var body = req.body;
        body.id = rows[0].id;
        body.status = 'sold';
        body.overdue = overdue; //TODO: remove hardcode
        body.updatedBy = req.session.user.id;
        body.updated = require('moment')().format('YYYY-MM-DD HH:mm:ss');
        body.created = require('moment')().format('YYYY-MM-DD HH:mm:ss');

        if (overdue && Number(card.pass) !== 0) {
            Card.resetPass(body, (err, rows) => {
                if (err) {
                    req.session.error = dict.messages.db_error+': '+err.message;
                    return res.redirect('/cards/sell');
                }
                if (rows.affectedRows == 0) {
                    req.session.error = dict.messages.card_sell_error;
                    return res.redirect('/cards/sell');
                }

                Card.sell(body, (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+': '+err.message;
                        return res.redirect('/cards/sell');
                    }
                    if (rows.affectedRows == 0) {
                        req.session.error = dict.messages.card_sell_error;
                        return res.redirect('/cards/sell');
                    }
                    Card.registerPass(body, (err, rows) => {
                        if (err) {
                            req.session.error = dict.messages.db_error+': '+err.message;
                            return res.redirect('/cards/sell');
                        }
                        if (rows.affectedRows == 0) {
                            req.session.error = dict.messages.card_sell_error;
                            return res.redirect('/cards/sell');
                        }
                        req.session.message = dict.messages.card_sold+": "+card_number;
                        return res.redirect('/cards/sell');
                    })
                })

            })
        } else {
            Card.sell(body, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+': '+err.message;
                    return res.redirect('/cards/sell');
                }
                if (rows.affectedRows == 0) {
                    req.session.error = dict.messages.card_sell_error;
                    return res.redirect('/cards/sell');
                }
                Card.registerPass(body, (err, rows) => {
                    if (err) {
                        req.session.error = dict.messages.db_error+': '+err.message;
                        return res.redirect('/cards/sell');
                    }
                    if (rows.affectedRows == 0) {
                        req.session.error = dict.messages.card_sell_error;
                        return res.redirect('/cards/sell');
                    }
                    req.session.message = dict.messages.card_sold+": "+card_number;
                    return res.redirect('/cards/sell');
                })
            })
        }
    })
});

router.get('/sellstocsv', (req, res, next)=> {

    const dstart = req.query.dstart ? req.query.dstart : '';
    const dend = req.query.dend ? req.query.dend : '';

    Card.getCardsForUserAndType(req.session.user, 'sold', dstart, dend, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/cards');
            return;
        }

        var head_array = [dict.labels.export_card_nb, dict.labels.export_card_qr, dict.labels.export_card_type, dict.labels.export_card_owner, dict.labels.export_card_seller, dict.labels.export_card_date];
        var headers_string = head_array.join(',');
        console.log(headers_string);

        var data = rows;

        var options = {
            delimiter   : ",",
            wrap        : false
        };

        var csv = csvjson.toCSV(data, options);

        var csv_array = csv.split('\n');
        csv_array.splice(0, 1, headers_string);
        csv = csv_array.join('\n');

        csv.replace('adult', dict.labels.label_tariff_adult);
        csv.replace('child', dict.labels.label_tariff_child);
        csv.replace('other', dict.labels.label_tariff_other);

        console.log('++-- CSV +++--+++')
        console.log(csv)
        console.log('++-- CSV +++--+++')

        var name = req.session.user.id;

        res.setHeader('Content-disposition', 'attachment; filename=soldCards-userid-'+name+'.csv');
        res.set('Content-Type', 'text/csv');
        res.status(200).send(csv);

    });

});
router.get('/sellstopdf', (req, res, next)=> {

    const dstart = req.query.dstart ? req.query.dstart : '';
    const dend = req.query.dend ? req.query.dend : '';

    Card.getCardsForUserAndType(req.session.user, 'sold', dstart, dend, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/cards');
            return;
        }

        var head_array = ['cardnb', 'qrcode', 'type', 'owner', 'seller', 'date'];
        var headers_string = head_array.join(',');
        console.log(headers_string);

        var content = '<style>table {width: 100%;font-family:sans-serif;font-size: 0.5em; border: 1px solid;border-spacing: 0;border-collapse: collapse;}table thead {border: 1px solid;background-color:#ccc !important;}tr {border: 1px solid;}th {padding: 0.2em 0.3em;border: 1px solid;} td {padding: 0.2em 0.3em;border: 1px solid;}</style>';
        content += '<table>';
        content += '<thead><th>Номер карты</th><th>QR код</th><th>Тип</th><th>Опубликовал</th><th>Продал</th><th>Дата</th></thead>';
        content += '<tbody>';

        var data = rows;
        data.forEach((row, index)=>{
            content += '<tr>';
            content += '<td>'+row['card_nb']+'</td>';
            content += '<td>'+row['qr_code']+'</td>';
            content += '<td>'+(row['type']=='adult'?dict.labels.label_tariff_adult:(row['type']=='child'?dict.labels.label_tariff_child:dict.labels.label_tariff_other))+'</td>';
            content += '<td>'+row['owner']+'</td>';
            content += '<td>'+row['seller']+'</td>';
            content += '<td>'+row['date']+'</td>';
            content += '</tr>';
        });
        content += '</tbody>';
        content += '</table>';

        var checkDate = '';
        checkDate += dstart != '' ? dstart+' - ' : 'не определено -';
        checkDate += dend != '' ? dend : ' не определено'

        var name = req.session.user.id;

        var pdf = require('html-pdf');

        console.log(content);

        var config = {
            // Export options
            "directory": "/tmp",       // The directory the file gets written into if not using .toFile(filename, callback). default: '/tmp'
            "format": "Letter",        // allowed units: A3, A4, A5, Legal, Letter, Tabloid
            "orientation": "portrait", // portrait or landscape
            // Page options
            "border": "10mm",

            paginationOffset: 1,       // Override the initial pagination number
            "header": {
                "height": "15mm",
                "contents": '<div style="text-align: center; width: 100%; border-bottom: 1px solid; font-family: sans-serif; font-size: 1em;">Продажа карт ('+req.session.user.name+' '+req.session.user.last+') ('+checkDate+')</div>'
            },
            "footer": {
                "height": "20mm",
                "contents": {
                    // first: 'Cover page',
                    // 2: 'Second page', // Any page number is working. 1-based index
                    default: '<div style="text-align: center; width: 100%; color: #444; border-top: 1px solid; font-family: sans-serif; font-size: 0.7em;"><span>{{page}}</span>/<span>{{pages}}</span></div>', // fallback value
                    // last: 'Last Page'
                }
            },
            // Rendering options
            // "base": "file:///home/www/your-asset-path", // Base path that's used to load files (images, css, js) when they aren't referenced using a host
            // Zooming option, can be used to scale images if `options.type` is not pdf
            "zoomFactor": "1", // default is 1
            // File options
            "type": "pdf",             // allowed file types: png, jpeg, pdf
            "quality": "75",           // only used for types png & jpeg
        };

        pdf.create(content, config).toStream((err, stream) => {
            if (err) return res.end(err.stack);
            res.setHeader('Content-type', 'application/pdf');
            stream.pipe(res.status(200));
            // res.status(200).send(stream);
        })

        // pdf.create(content, config).toFile('./businesscard.pdf', function(err, res) {
        //     if (err) return console.log(err);
        //     console.log(res); // { filename: '/app/businesscard.pdf' }
        // });

    });

});

module.exports = router;
