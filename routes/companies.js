var express = require('express');
var User = require('./../models/user');
var Company = require('./../models/company');
var Location = require('./../models/location');
var Terminal = require('./../models/terminal');
var Tariff = require('./../models/tariff');
var Visit = require('./../models/visit');
var Card = require('./../models/card');
var locale = require('./../misc/locale');
var config = require('./../misc/config');
var dict = locale[config.locale];
var globals = require('./../misc/globals');
var log = require('npmlog');
var bcrypt = require('bcrypt');
var moment = require('moment');

var router = express.Router();

var getTerminalForUser = (tid, terminals)=>{
    var t = null;
    terminals.forEach((terminal, index)=>{
        if (terminal.id === tid) {
            console.log(terminal.id+" == "+tid);
            console.log(terminal);
            t = terminal;
        }
    });
    return t;
};

var checkCompany = (req, res, next)=>{
    if (req.params.cid) {
        Company.getById(req.params.cid, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.code;
                return res.redirect('/companies');
            }
            if (rows.length == 0) {
                req.session.error = dict.messages.company_not_found;
                return res.redirect('/companies');
            }
            if (req.session.user.role !== 'super') {
                User.allowedCompany(req.session.user, req.params.cid, (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+":"+err.code;
                        return res.redirect('/companies');
                    }
                    if (rows.length == 0) {
                        req.session.error = dict.messages.company_not_allowed;
                        return res.redirect('/companies');
                    } else {
                        next();
                    }
                })
            } else {
                next();
            }
        })
    } else {
        next()
    }
};

var checkTerminal = (req, res, next)=>{
    if (req.params.tid) {
        Terminal.getById(req.params.tid, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.code;
                return res.redirect('/companies');
            }
            if (rows.length == 0) {
                req.session.error = dict.messages.terminal_not_found;
                return res.redirect('/companies');
            }
            if (req.session.user.role !== 'super') {
                User.allowedTerminal(req.session.user, req.params.cid, req.params.tid, (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+":"+err.code;
                        return res.redirect('/companies');
                    }
                    if (rows.length == 0) {
                        req.session.error = dict.messages.terminal_not_allowed;
                        return res.redirect('/companies');
                    } else {
                        next();
                    }
                })
            } else {
                next();
            }
        })
    } else {
        next()
    }
};

var visitPreActions = (req, res, next)=> {
    req.checkBody('card', dict.messages.visit_card_number_required).notEmpty();
    req.checkBody('tariff', dict.messages.visit_tariff_required).notEmpty();
    req.checkBody('price', dict.messages.tariff_discount_required).notEmpty();

    let errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
    }
    Card.getByIdOrNumberForUser(req.body.card, req.session.user, (err, rows)=> {
        if (err) {
            req.session.error = dict.messages.db_error + ': ' + err.message;
            return res.redirect('/companies/' + req.params.cid + '/terminals/' + req.params.tid + '/visits/add');
        }
        if (rows.length === 0) {
            req.session.error = dict.messages.card_not_found;
            return res.redirect('/companies/' + req.params.cid + '/terminals/' + req.params.tid + '/visits/add');
        }

        req.card = rows[0];

        let card = req.card;

        if (card.status !== 'sold') {
            req.session.error = dict.messages.visit_card_not_allowed + '. '+dict.labels.label_card_status + ': '+globals.methods.nameById(card.status, config.cardStatus);
            return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
        }

        var body = req.body;
        body.cardFull = rows[0];
        body.card = rows[0].id;

        if (body.tariffType !== card.type) {
            req.session.error = dict.messages.visit_card_tariff_type_error + ' (' + globals.methods.nameById(body.tariffType, config.tariffTypes) + ' <> ' + globals.methods.nameById(card.type, config.tariffTypes) + ')';
            return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
        }

        if (body.tariffType === 'group') {
            if (body.cardFull.card_nb !== body.cardNumber) {
                req.session.error = dict.messages.visit_card_tariff_error;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
            }
        } else {
            if (card.type === 'group') {
                req.session.error = dict.messages.tariff_card_not_allowed;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
            }
        }

        body.user = req.session.user.id;
        body.created = require('moment')().format('YYYY-MM-DD HH:mm:ss');

        req.fullbody = body;

        console.log(body);

        card.passCount = globals.methods.getPassCount(card.pass);

        Card.checkExpired(card, (err, result)=>{
            if (err) {
                req.session.error = dict.messages.db_error + ': ' + err.message;
                return res.redirect('/companies/' + req.params.cid + '/terminals/' + req.params.tid + '/visits/add');
            }
            Card.checkValidity(body, req.card, (err, result)=>{

                if (err) {
                    req.session.error = dict.messages.db_error + ': ' + err.message;
                    return res.redirect('/companies/' + req.params.cid + '/terminals/' + req.params.tid + '/visits');
                }
                if (!result.success) {
                    req.session.error = dict.messages.card_invalid + ': (' + req.card.card_nb + '). Details: ' + result.message;
                    return res.redirect('/companies/' + req.params.cid + '/terminals/' + req.params.tid + '/visits');
                }
                next();
            })
        });
    })
};

var tariffPreActions = (req, res, next)=> {
    req.checkBody('name', dict.messages.tariff_name_required).notEmpty();
    req.checkBody('type', dict.messages.tariff_type_required).notEmpty();
    req.checkBody('discount', dict.messages.tariff_discount_required).notEmpty();
    req.checkBody('discountType', dict.messages.discount_type_required).notEmpty();
    if (req.body.type === 'group') {
        req.checkBody('card', dict.messages.tariff_card_required).notEmpty();
    }

    console.log(req.body);

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
        return;
    }
    if (req.body.type === 'group') {
        Card.getByIdOrNumberForUser(req.body.card, req.session.user, (err, rows)=> {
            if (err) {
                req.session.error = dict.messages.db_error + ': ' + err.message;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
            }
            if (rows.length === 0) {
                req.session.error = dict.messages.card_not_found;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
            }

            req.body.card = rows[0];

            let card = req.body.card;

            if (card.status !== 'sold') {
                req.session.error = dict.messages.tariff_card_not_sold;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
            }

            if (card.type !== 'group') {
                req.session.error = dict.messages.tariff_card_not_allowed;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
            }

            next();
            // Card.checkCardAssignedGroup(card, (err, rows)=>{
            //     if (err) {
            //         req.session.error = dict.messages.db_error + ': ' + err.message;
            //         return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
            //     }
            //     if (rows.length > 0) {
            //         req.session.error = dict.messages.card_already_assigned;
            //         return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
            //     }
            //     next();
            // });

        })
    } else {
        next();
    }

};

var tariffEditPreActions = (req, res, next)=> {
    req.checkBody('name', dict.messages.tariff_name_required).notEmpty();
    req.checkBody('type', dict.messages.tariff_type_required).notEmpty();
    req.checkBody('discount', dict.messages.tariff_discount_required).notEmpty();
    req.checkBody('discountType', dict.messages.discount_type_required).notEmpty();
    if (req.body.type === 'group') {
        req.checkBody('card', dict.messages.tariff_card_required).notEmpty();
    }

    console.log(req.body);

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/'+req.params.trid+'/edit');
    }
    if (req.body.type === 'group' && req.body.card) {
        Card.getByIdOrNumberForUser(req.body.card, req.session.user, (err, rows)=> {
            if (err) {
                req.session.error = dict.messages.db_error + ': ' + err.message;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/'+req.params.trid+'/edit');
            }
            if (rows.length === 0) {
                req.session.error = dict.messages.card_not_found;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/'+req.params.trid+'/edit');
            }

            req.body.card = rows[0];

            let card = req.body.card;

            console.log('===CARD===')
            console.log(card)
            console.log('===CARD===')

            if (card.status !== 'sold') {
                req.session.error = dict.messages.tariff_card_not_sold;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/'+req.params.trid+'/edit');
            }

            if (card.type !== 'group') {
                req.session.error = dict.messages.tariff_card_not_allowed;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/'+req.params.trid+'/edit');
            }

            // Card.checkCardAssignedGroup(card, (err, rows)=>{
            //     if (err) {
            //         req.session.error = dict.messages.db_error + ': ' + err.message;
            //         return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/'+req.params.trid+'/edit');
            //     }
            //     next();
            // });
            next();

        })
    } else (
        next()
    )

};

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

router.use((req, res, next)=> {
    if (req.params.tid) {
        Terminal.getById(req.params.tid, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.code;
                return res.redirect('/companies');
            }
            if (rows.length === 0) {
                req.session.error = dict.messages.terminal_not_found;
                return res.redirect('/companies');
            }
            next();
        });
    } else {
        next();
    }
});


/*
 * Get companies + terminals
 */

router.get('/', (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getAllCompanies(req.session.user.role, req.session.user.id, (err, rows)=>{
        if (err) {
            req.session.error = 'Company error: '+err.message;
            return res.redirect('/');
        }

        if (!rows.length) {
            return res.render('company/list', {
                pageType: 'companies',
                dict: dict,
                account: req.session.user,
                items: rows,
                message: session_message,
                error: session_error,
                errors: session_validate_error
            });
        } else {
            var resultRows = [];
            var length = rows.length;
            var count = 0;

            var allowReport = req.session.user.role !== 'cashier';

            rows.forEach((row, index)=>{

                var resRow = row;
                console.log(row);
                resRow.terminals = [];

                Terminal.getForCompany(resRow.id, (err, rows)=>{
                    count++;
                    if (err) {
                        return res.render('company/list', {
                            pageType: 'companies',
                            dict: dict,
                            account: req.session.user,
                            items: rows,
                            message: session_message,
                            error: session_error,
                            errors: [{msg: dict.messages.db_error + err.code}]
                        });
                    } else {
                        resRow.terminals = rows;
                        console.log(rows);
                        resultRows[index] = resRow;

                        if (req.session.user.role === 'cashier' && resRow.terminal === null) {
                            allowReport = true;
                        }

                        if (count == length) {
                            return res.render('company/list', {
                                pageType: 'companies',
                                dict: dict,
                                account: req.session.user,
                                items: resultRows,
                                message: session_message,
                                allowReport: allowReport,
                                error: session_error,
                                errors: session_validate_error
                            });
                        }
                    }
                })
            })
        }
    })
});

/*
 * Create company
 */

//create company form
router.get('/create', (req, res, next)=> {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Location.getCountries(function (err, rows) {
        if (err) {
            req.session.error = 'Location error: '+err.message;
            return res.redirect('/companies');
        }
        var countries = rows;
        var fos = [];
        var regions = [];

        if (req.session.user.role === 'super') {
            User.getForParentRole(req.session.user.id, 'admin', (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages['db_error']+":"+err.code;
                    res.redirect('/users');
                    return;
                }
                return res.render('company/create', {
                    pageType: 'companies',
                    dict: dict,
                    adminlist: rows,
                    account: req.session.user,
                    countries: countries,
                    fos: fos,
                    regions: regions,
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error
                });

            })
        } else {
            return res.render('company/create', {
                pageType: 'companies',
                dict: dict,
                account: req.session.user,
                countries: countries,
                fos: fos,
                regions: regions,
                message: session_message,
                error: session_error,
                errors: session_validate_error
            });
        }

    });
});

//create company post
router.post('/create', function(req, res, next) {

    req.checkBody('owner', dict.messages.administrator_required).notEmpty();
    req.checkBody('name', dict.messages.company_name_required).notEmpty();
    req.checkBody('country', dict.messages.country_name_required).notEmpty();
    req.checkBody('foc', dict.messages.fo_name_required).notEmpty();
    req.checkBody('region', dict.messages.region_name_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/companies/create');
        return;
    }

    console.log(req.body);
    Company.create(req.body, function(err, row){
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            return res.redirect('/companies/create');
        } else {
            if (row.affectedRows == 0) {
                req.session.error = dict.messages.company_exists;
                return res.redirect('/companies/create');
            }
            User.updateReference(req.body.owner, row.insertId, null, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+": "+err.message;
                    return res.redirect('/companies/create');
                }
                req.session.message = dict.messages.company_created;
                return res.redirect('/companies');
            })

        }
    })
});

/*
 * Edit company
 */

//edit company form
router.get('/:cid/edit', checkCompany, (req, res, next)=> {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getById(req.params.cid, (err, rows)=>{
        var company = rows[0];
        Location.getCountries((err, rows)=> {
            if (err) {
                req.session.error = dict.messages.db_error+': '+err.message;
                return res.redirect('/companies');
            }

            var countries = rows;
            Location.getFoByCountry(company.country, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+': '+err.message;
                    return res.redirect('/companies');
                }
                var fos = rows;

                Location.getRegionByFo(company.foc, (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+': '+err.message;
                        return res.redirect('/companies');
                    }
                    var regions = rows;

                    if (req.session.user.role === 'super') {
                        User.getForParentRole(req.session.user.id, 'admin', (err, rows)=>{
                            if (err) {
                                req.session.error = dict.messages['db_error']+":"+err.code;
                                res.redirect('/companies');
                                return;
                            }
                            return res.render('company/edit', {
                                pageType: 'companies',
                                dict: dict,
                                adminlist: rows,
                                account: req.session.user,
                                countries: countries,
                                fos: fos,
                                regions: regions,
                                company: company,
                                message: session_message,
                                error: session_error,
                                errors: session_validate_error
                            });

                        })
                    } else {
                        return res.render('company/edit', {
                            pageType: 'companies',
                            dict: dict,
                            account: req.session.user,
                            countries: countries,
                            fos: fos,
                            regions: regions,
                            company: company,
                            message: session_message,
                            error: session_error,
                            errors: session_validate_error
                        });
                    }
                });
            });

        });
    });
});

router.put('/:cid/edit', function(req, res, next) {

    req.checkBody('owner', dict.messages.administrator_required).notEmpty();
    req.checkBody('name', dict.messages.company_name_required).notEmpty();
    req.checkBody('country', dict.messages.country_name_required).notEmpty();
    req.checkBody('foc', dict.messages.fo_name_required).notEmpty();
    req.checkBody('region', dict.messages.region_name_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        return res.redirect('/companies/'+req.body.id+'/edit');
    }
    console.log(req.body);

    Company.update(req.body, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            return res.redirect('/companies');
        }
        if (rows.affectedRows === 0) {
            req.session.error = dict.messages.company_edit_error;
        } else {
            req.session.message = dict.messages.company_updated;
        }
        return res.redirect('/companies');
    })

});

/*
 * Delete company
 */

router.delete('/:cid/delete', checkCompany, function(req, res, next) {

    Company.delete(req.params.cid, function(err, rows) {
        if (err) {
            req.session.error = dict.messages.db_error+': '+err.message;
        } else {
            if (rows.affectedRows) {
                req.session.message = dict.messages.company_deleted;
            } else {
                req.session.error = dict.messages.company_not_deleted;
            }
        }
        return res.status(200).send('ok');
    });

});


/*
 * Terminals
 */

router.get('/:cid/terminals', (req, res, next)=>{
    return res.redirect('/companies');

});

router.get('/:cid/terminals/create', checkCompany, (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getExtendedByIdAndOwner(req.params.cid, req.session.user, (err, rows)=>{
        var company = rows[0];
        var discountTypes = [
            {id: 'pass', name: dict.labels.label_pass},
            {id: 'discount', name: dict.labels.label_discount},
        ];

        return res.render('terminal/create', {
            pageType: 'companies',
            dict: dict,
            company: company,
            discounts: discountTypes,
            account: req.session.user,
            message: session_message,
            error: session_error,
            errors: session_validate_error
        });

    });
});

router.post('/:cid/terminals/create', (req, res, next)=> {

    var cid = req.params.cid;

    req.checkBody('name', dict.messages.terminal_name_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        return res.redirect('/companies/'+cid+'/terminals/create');
    }
    Terminal.create(req.body, (err, rows)=>{
        if (err) {
            console.log(err);
            req.session.error = dict.messages.db_error+":"+err.message;
            return res.redirect('/companies/'+cid+'/terminals/create');
        }

        console.log(rows);
        if (rows.affectedRows == 0) {
            req.session.error = dict.messages.terminal_create_error;
        } else {
            req.session.message = dict.messages.terminal_created;
        }
        return res.redirect('/companies');
    })

});

router.delete('/:cid/terminals/:tid/delete', (req, res, next)=>{

    Terminal.delete(req.params.tid, function(err, rows) {
        if (err) {
            req.session.error = dict.messages.db_error+': '+err.message;
        } else {
            if (rows.affectedRows) {
                req.session.message = dict.messages.terminal_deleted;
            } else {
                req.session.error = dict.messages.terminal_not_deleted;
            }
        }
        return res.status(200).send('ok');
    });
});

router.get('/:cid/terminals/:tid/edit', checkCompany, checkTerminal, (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getExtendedByIdAndOwner(req.params.cid, req.session.user, (err, rows)=>{
        var company = rows[0];
        var discountTypes = [
            {id: 'pass', name: dict.labels.label_pass},
            {id: 'discount', name: dict.labels.label_discount},
        ];

        Terminal.getById(req.params.tid, (err, rows)=>{

            return res.render('terminal/edit', {
                pageType: 'companies',
                dict: dict,
                company: company,
                terminal: rows[0],
                discounts: discountTypes,
                account: req.session.user,
                message: session_message,
                error: session_error,
                errors: session_validate_error
            });


        });

    });

});

router.put('/:cid/terminals/:tid/edit', (req, res, next)=>{

    req.checkBody('name', dict.messages.terminal_name_required).notEmpty();
    //req.checkBody('type', dict.messages.terminal_type_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/companies/'+req.body.cid+'/terminals/'+req.body.tid+'/edit');
        return;
    }

    Terminal.update(req.body, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            return res.redirect('/companies');
        }
        if (rows.affectedRows === 0) {
            req.session.error = dict.messages.terminal_edit_error;
        } else {
            req.session.message = dict.messages.terminal_updated;
        }
        return res.redirect('/companies');
    })

});

/*
 * Company users
 */

router.get('/:cid/users', checkCompany, (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getExtendedByIdAndOwner(req.params.cid, req.session.user, (err, rows)=>{

        var company = rows[0];

        Terminal.getForCompany(req.params.cid, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.code;
                res.redirect('/companies');
                return;
            }
            var terminals = rows;
            User.getByCompany(req.params.cid, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+":"+err.code;
                    res.redirect('/companies');
                    return;
                }
                var users = [];

                rows.forEach((row, index)=>{
                    var finalRow = row;
                    var terminal = getTerminalForUser(row.tid, terminals);
                    finalRow.terminal = terminal;
                    users.push(finalRow)
                });

                return res.render('user/list', {
                    pageType: 'companies',
                    dict: dict,
                    company: company,
                    terminals: terminals,
                    items: users,
                    account: req.session.user,
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error
                });
            })
        });
    })
});

/*
 * Create user - cashier
 */

router.get('/:cid/users/create', checkCompany, (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getExtendedByIdAndOwner(req.params.cid, req.session.user, (err, rows)=>{

        var company = rows[0];

        Terminal.getForCompany(req.params.cid, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.code;
                res.redirect('/companies');
                return;
            }
            var terminals = rows;

            return res.render('user/create', {
                pageType: 'companies',
                dict: dict,
                company: company,
                terminals: terminals,
                account: req.session.user,
                message: session_message,
                error: session_error,
                errors: session_validate_error
            });


        });
    })
});

router.post('/:cid/users/create', (req, res, next)=> {

    req.checkBody('name', dict.messages.name_required).notEmpty();
    req.checkBody('last', dict.messages.last_required).notEmpty();
    req.checkBody('email', dict.messages.email_required).notEmpty();
    req.checkBody('email', dict.messages.email_not_valid).isEmail();
    req.checkBody('password', dict.messages.password_required).notEmpty();
    req.checkBody('confirmPassword', dict.messages.password_not_match).equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/companies/'+req.params.cid+'/users/create');
        return;
    }

    bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
        //save to db
        User.createUser(req.body, bcryptedPassword, function(err, row){
            if (err) {
                req.session.error = err;
                res.redirect('/companies/'+req.params.cid+'/users/create');
                return;
            }
            if (row.affectedRows == 0) {
                req.session.error = dict.messages.db_error;
                res.redirect('/companies/'+req.params.cid+'/users/create');
                return;
            }

            var tid = req.body.tid ? req.body.tid : null;
            User.updateReference(row.insertId, req.body.cid, tid, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+": "+err.message;
                    return res.redirect('/companies/'+req.params.cid+'/users');
                }
                req.session.message = dict.messages.user_created;
                return res.redirect('/companies/'+req.params.cid+'/users');
            })

        })

    });

});

/*
 * Edit user - cashier
 */

router.get('/:cid/users/:uid/edit', checkCompany, (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getExtendedByIdAndOwner(req.params.cid, req.session.user, (err, rows)=>{

        var company = rows[0];

        Terminal.getForCompany(req.params.cid, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.code;
                res.redirect('/companies');
                return;
            }
            var terminals = rows;

            User.getExtendedByIdAndCompany(req.params.uid, req.params.cid, (err, rows)=>{
                if (err) {
                    req.session.error = err;
                    res.redirect('/companies/'+req.params.cid+'/users/'+req.params.cid+'/edit');
                    return;
                }
                var user = rows[0];
                return res.render('user/edit', {
                    pageType: 'companies',
                    dict: dict,
                    company: company,
                    terminals: terminals,
                    user: user,
                    account: req.session.user,
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error
                });

            });
        });
    })
});

router.put('/:cid/users/:uid/edit', (req, res, next)=> {

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
    req.checkBody('confirmPassword', dict.messages.password_not_match).equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/companies/'+req.params.cid+'/users/'+req.params.cid+'/edit');
        return;
    }

    if (req.body.password) {
        bcrypt.hash(req.body.password, 5, function( err, bcryptedPassword) {
            //save to db
            User.updateUser(req.body, bcryptedPassword, function(err, rows){
                if (err) {
                    req.session.error = dict.messages.user_edit_error+": "+err.sqlMessage;
                    return res.redirect('/companies/'+req.params.cid+'/users');
                }
                if (rows.affectedRows == 0) {
                    req.session.error = dict.messages.user_edit_error;
                    return res.redirect('/companies/'+req.params.cid+'/users');
                }

                var tid = req.body.tid ? req.body.tid : '0';
                User.updateReference(req.body.id, req.body.cid, tid, (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+": "+err.message;
                        return res.redirect('/companies/'+req.params.cid+'/users');
                    }
                    req.session.message = dict.messages.user_updated;
                    return res.redirect('/companies/'+req.params.cid+'/users');
                })
            })

        });
    } else {
        User.updateUser(req.body, null, function(err, rows){
            if (err) {
                req.session.error = dict.messages.user_edit_error+": "+err.sqlMessage;
                return res.redirect('/companies/'+req.params.cid+'/users');
            }
            if (rows.affectedRows == 0) {
                req.session.error = dict.messages.user_edit_error;
                return res.redirect('/companies/'+req.params.cid+'/users');
            }

            User.updateReference(req.body.id, req.body.cid, req.body.tid, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+": "+err.message;
                    return res.redirect('/companies/'+req.params.cid+'/users');
                }
                req.session.message = dict.messages.user_updated;
                return res.redirect('/companies/'+req.params.cid+'/users');
            })

        })
    }

});

router.delete('/:cid/users/:uid/delete', function(req, res, next) {

    var delid = req.params.uid;

    User.delete(delid, (err, rows) => {
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
 * Tariffs
 */

router.get('/:cid/terminals/:tid/tariffs', checkCompany, checkTerminal, (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    let dstart = req.query.dstart ? req.query.dstart : '';
    let dend = req.query.dend ? req.query.dend : '';

    console.log('dstart='+dstart);

    let queryarray = [];
    let dstartfull = '';
    let dendfull = '';
    if (dstart != '') {
        dstartfull = dstart + ' 00:00:00';
        queryarray.push('dstart='+dstart);
    }
    if (dend != '') {
        dendfull = dend +' 23:59:59';
        queryarray.push('dend='+dend);
    }
    let querystr = (dstart != '' || dend != '') ? '?' : '';
    querystr += queryarray.join('&');

    console.log(dstartfull + ' == ' + dendfull);

    Company.getExtendedByIdAndOwner(req.params.cid, req.session.user, (err, rows)=>{

        var company = rows[0];

        Terminal.getForCompany(req.params.cid, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.code;
                res.redirect('/companies');
                return;
            }

            var terminals = rows;

            Terminal.getById(req.params.tid, (err, rows)=>{
                var terminal = rows[0];
                Tariff.getForTerminal(req.params.tid, (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+":"+err.code;
                        res.redirect('/companies');
                        return;
                    }

                    var tariffs = rows;

                    return res.render('tariff/list', {
                        pageType: 'companies',
                        dict: dict,
                        company: company,
                        terminal: terminal,
                        terminals: terminals,
                        items: tariffs,
                        dstart: dstart,
                        dend: dend,
                        account: req.session.user,
                        message: session_message,
                        error: session_error,
                        errors: session_validate_error
                    });
                });
            });

        });
    })
});

/*
 * Create tariff
 */

router.get('/:cid/terminals/:tid/tariffs/create', checkCompany, checkTerminal, (req, res, next)=> {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getExtendedByIdAndOwner(req.params.cid, req.session.user, (err, rows)=>{

        var company = rows[0];

        Terminal.getForCompany(req.params.cid, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.code;
                res.redirect('/companies');
                return;
            }
            var terminals = rows;

            Terminal.getById(req.params.tid, (err, rows)=>{
                var terminal = rows[0];

                var tariffTypes = [{id:""}];

                return res.render('tariff/create', {
                    pageType: 'companies',
                    dict: dict,
                    company: company,
                    terminal: terminal,
                    terminals: terminals,
                    types: config.tariffTypes,
                    discountTypes: config.discountTypes,
                    discountUnits: config.discountUtits,
                    passes: config.passType,
                    account: req.session.user,
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error
                });
            });
        });
    })
});

router.post('/:cid/terminals/:tid/tariffs/create', tariffPreActions, (req, res, next)=> {

    console.log(req.body);

    Tariff.create(req.body, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
        }

        console.log(rows);

        if (rows.affectedRows === 0) {
            req.session.error = dict.messages.tariff_create_error;
            return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
        }
        req.session.message = dict.messages.tariff_created;
        return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs');
    })

});

router.delete('/:cid/terminals/:tid/tariffs/:trid/delete', (req, res, next)=>{

    Tariff.delete(req.params.trid, function(err, rows) {
        if (err) {
            req.session.error = dict.messages.db_error+': '+err.message;
        } else {
            if (rows.affectedRows) {
                req.session.message = dict.messages.tariff_deleted;
            } else {
                req.session.error = dict.messages.tariff_not_deleted;
            }
        }
        return res.status(200).send('ok');
    });
});

router.get('/:cid/terminals/:tid/tariffs/:trid/edit', checkCompany, checkTerminal, (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getExtendedByIdAndOwner(req.params.cid, req.session.user, (err, rows)=>{

        var company = rows[0];

        Terminal.getForCompany(req.params.cid, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+":"+err.code;
                res.redirect('/companies');
                return;
            }
            if (rows.length === 0) {
                req.session.error = dict.messages.terminal_not_found;
                res.redirect('/companies');
                return;
            }

            var terminals = rows;

            Terminal.getById(req.params.tid, (err, rows)=>{
                var terminal = rows[0];

                Tariff.getByIdCard(req.params.trid, (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+":"+err.code;
                        res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs');
                        return;
                    }
                    if (rows.length === 0) {
                        req.session.error = dict.messages.db_error;
                        res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs');
                        return;
                    }

                    return res.render('tariff/edit', {
                        pageType: 'companies',
                        dict: dict,
                        company: company,
                        terminal: terminal,
                        tariff: rows[0],
                        terminals: terminals,
                        types: config.tariffTypes,
                        passes: config.passType,
                        discountTypes: config.discountTypes,
                        discountUnits: config.discountUtits,
                        account: req.session.user,
                        message: session_message,
                        error: session_error,
                        errors: session_validate_error
                    });
                });

            });
        });
    })

});

router.put('/:cid/terminals/:tid/tariffs/:trid/edit', tariffEditPreActions, (req, res, next)=>{

    console.log('do update');
    Tariff.update(req.body, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/'+req.params.trid+'/edit');
            return;
        }
        if (rows.affectedRows === 0) {
            req.session.error = dict.messages.tariff_update_error;
            res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/'+req.params.trid+'/edit');
            return;
        }
        req.session.message = dict.messages.tariff_updated;
        return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs');
    })

});

/*
 * Visits
 */

router.get('/:cid/terminals/:tid/visits', checkCompany, checkTerminal, (req, res, next)=> {
    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getExtendedByIdAndOwner(req.params.cid, req.session.user, (err, rows)=> {
        var company = rows[0];

        Terminal.getById(req.params.tid, (err, rows)=>{
            var terminal = rows[0];

            Visit.getExtendedForTerminal(req.params.tid, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+":"+err.code;
                    res.redirect('/companies');
                    return;
                }
                return res.render('visit/list', {
                    pageType: 'companies',
                    dict: dict,
                    company: company,
                    terminal: terminal,
                    items: rows,
                    account: req.session.user,
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error
                });

            })

        })
    });

});

/*
 * Create visit
 */

router.get('/:cid/terminals/:tid/visits/add', checkCompany, checkTerminal, (req, res, next)=> {

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;

    Company.getExtendedByIdAndOwner(req.params.cid, req.session.user, (err, rows)=> {
        var company = rows[0];

        Terminal.getById(req.params.tid, (err, rows)=>{
            var terminal = rows[0];

            Tariff.getForTerminal(req.params.tid, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+":"+err.code;
                    return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits');
                }
                if (rows.length === 0) {
                    req.session.error = dict.messages.tariff_not_found;
                    return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits');
                }
                var tariffs = rows;

                return res.render('visit/create', {
                    pageType: 'companies',
                    dict: dict,
                    company: company,
                    terminal: terminal,
                    tariffs: tariffs,
                    passes: config.passType,
                    account: req.session.user,
                    types: config.discountTypes,
                    message: session_message,
                    error: session_error,
                    errors: session_validate_error
                });
            });
        })
    });

});

router.post('/:cid/terminals/:tid/visits/add', visitPreActions, (req, res, next)=> {

    var body = req.fullbody;

    let card = req.card;

    Visit.add(body, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+': '+err.message;
            return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
        }
        if (rows.affectedRows == 0) {
            req.session.error = dict.messages.visit_create_error;
            return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
        }
        req.session.message = dict.messages.visit_created;
        res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits');

    })

});

router.post('/:cid/terminals/:tid/visits/addsell', visitPreActions, (req, res, next)=> {

    var body = req.fullbody;

    let card = req.card;
    console.log(body);

    if (card.pass === '0') {

        var sellBody = {};

        sellBody.id = card.id;
        sellBody.status = 'sold';
        sellBody.updatedBy = req.session.user.id;
        sellBody.updated = require('moment')().format('YYYY-MM-DD HH:mm:ss');
        sellBody.pass = body.pass;
        sellBody.type = body.tariffType;

        Card.sell(sellBody, (err, rows)=>{

            console.log('==============');
            console.log(sellBody);

            if (err) {
                req.session.error = dict.messages.db_error+': '+err.message;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
            }
            if (rows.affectedRows == 0) {
                req.session.error = dict.messages.card_sell_error;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
            }

            Visit.add(body, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+': '+err.message;
                    return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
                }
                if (rows.affectedRows == 0) {
                    req.session.error = dict.messages.visit_create_error;
                    return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
                }
                req.session.message = dict.messages.visit_created;
                res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits');

            })

        });

    } else {
        Visit.add(body, (err, rows)=>{
            if (err) {
                req.session.error = dict.messages.db_error+': '+err.message;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
            }
            if (rows.affectedRows == 0) {
                req.session.error = dict.messages.visit_create_error;
                return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
            }
            req.session.message = dict.messages.visit_created;
            res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits');

        })
    }
});

router.post('/:cid/terminals/:tid/visits/addold', (req, res, next)=> {
    req.checkBody('card', dict.messages.visit_card_number_required).notEmpty();
    req.checkBody('tariff', dict.messages.visit_tariff_required).notEmpty();
    req.checkBody('price', dict.messages.tariff_discount_required).notEmpty();

    let errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
        return;
    }

    Card.getByIdOrNumberForUser(req.body.card, req.session.user, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+': '+err.message;
            return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
        }
        if (rows.length === 0) {
            req.session.error = dict.messages.card_not_found;
            return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
        }

        var body = req.body;

        let card = rows[0].id;

        body.card = rows[0].id;
        body.user = req.session.user.id;
        body.created = require('moment')().format('YYYY-MM-DD HH:mm:ss');
        console.log(body);

        if (rows[0].pass === '0') {

            var sellBody = {};

            sellBody.id = rows[0].id;
            sellBody.status = 'sold';
            sellBody.updatedBy = req.session.user.id;
            sellBody.updated = require('moment')().format('YYYY-MM-DD HH:mm:ss');
            sellBody.pass = body.pass;
            sellBody.type = body.tariffType;

            Card.sell(sellBody, (err, rows)=>{

                console.log('==============');
                console.log(sellBody);

                if (err) {
                    req.session.error = dict.messages.db_error+': '+err.message;
                    return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
                }
                if (rows.affectedRows == 0) {
                    req.session.error = dict.messages.card_sell_error;
                    return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
                }

                Visit.add(body, (err, rows)=>{
                    if (err) {
                        req.session.error = dict.messages.db_error+': '+err.message;
                        return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
                    }
                    if (rows.affectedRows == 0) {
                        req.session.error = dict.messages.visit_create_error;
                        return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
                    }
                    req.session.message = dict.messages.visit_created;
                    res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits');

                })

            });

        } else {
            Visit.add(body, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+': '+err.message;
                    return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
                }
                if (rows.affectedRows == 0) {
                    req.session.error = dict.messages.visit_create_error;
                    return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
                }
                req.session.message = dict.messages.visit_created;
                res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits');

            })
        }
    })
});

/*
 *
 */

router.get('/admins/:id/companies', function (req, res, next) {

    Company.getCompaniesForOwner(req.params.id, (err, rows)=>{
        if (err) {
            return res.status(500).send(err);
        }
        return res.status(200).send(rows);
    });

});

router.get('/super/:id/companies', function (req, res, next) {

    Company.getCompaniesForParent(req.params.id, (err, rows)=>{
        if (err) {
            return res.status(500).send(err);
        }
        return res.status(200).send(rows);
    });

});

//report

var getDate = (dateString) => {
    let dt = new Date(dateString);
    if (dt && dt instanceof Date && !isNaN(dt)) {
        return moment(dateString).format("DD.MM.YYYY");
    }
    return '';
};

var getMonth = (dateString) => {
    let dt = new Date(dateString);
    if (dt && dt instanceof Date && !isNaN(dt)) {
        return moment(dateString).format("MM");
    }
    return '';
};


var generateReport = (company, visits, type, detailType, checkDate, datestart, dateend, month) => {

    let prilNumber = (detailType === 'detailed') ? '2' : '3';
    let prilTitle = (detailType === 'detailed') ? 'Выгрузка по проходам  за период с ' + datestart + ' по ' +dateend : 'Акт № '+company.dogovor + '/' +month + ' от '+ dateend;

    let html = '';

    html += '    <style>\n' +
        '        body {font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 12px;}\n' +
        '        table {border-collapse: collapse; table-layout:fixed; font-size: 10px;font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;}\n' +
        '        td, th {vertical-align: middle; padding: 5px;}\n' +
        '        .header-1 {padding: 5px 0}\n' +
        '        .header-2 {padding: 10px 0; font-size: 16px; font-weight: bold;border-bottom: 1px black solid; border-top: 1px black solid;}\n' +
        '        .header-3 {padding: 5px;}\n' +
        '        .header-left {width: 100px;}\n' +
        '        .border-top {border-top: 1px black solid;}\n' +
        '        .border-bottom {border-bottom: 1px black solid;}\n' +
        '        .header-right {font-weight: bold;}\n' +
        '        .bold {font-weight: bold}\n' +
        '        .align-right {text-align: right}\n' +
        '        .align-left {text-align: left}\n' +
        '        .c-5 {width: 5%}\n' +
        '        .c-10 {width: 10%}\n' +
        '        .c-15 {width: 15%}\n' +
        '        .c-20 {width: 20%}\n' +
        '        .pt-10 {padding-top: 10px}\n' +
        '        .pt-20 {padding-top: 20px}\n' +
        '    </style>\n';
    html += '<table border=0 cellpadding=0 cellspacing=0 width=540>\n' +
        '    <tr>\n' +
        '        <td colspan="2" class="header-1 align-right">\n' +
        '            Приложение № ' + prilNumber + ' к Договору № '+company.dogovor+' от '+getDate(company.dogovordate)+' \n' +
        '        </td>\n' +
        '    </tr>\n' +
        '    <tr>\n' +
        '        <td colspan="2"  class="header-2 align-left">\n' + prilTitle + '\n' +
        '        </td>\n' +
        '    </tr>\n' +
        '</table>\n';
    html += '<table border=0 cellpadding=0 cellspacing=0 width=540>\n' +
        '    <tr>\n' +
        '        <td class="header-3 header-left">\n' +
        '            Исполнитель:\n' +
        '        </td>\n' +
        '        <td class="header-3 header-right">\n' +
        '            ООО "КАРТА ГОСТЯ КРЫМА", ИНН 9102222457, 295034, Крым Респ, Симферополь г, Победы пр-кт, дом № 28, литера А, офис 204, р/с 40702810902390002565, в банке АО "АЛЬФА-БАНК", БИК 044525593, к/с 30101810200000000593\n' +
        '        </td>\n' +
        '    </tr>\n' +
        '    <tr>\n' +
        '        <td class="header-3 header-left">\n' +
        '            Заказчик:\n' +
        '        </td>\n' +
        '        <td class="header-3 header-right">\n' +
        '            '+company.name+', ИНН '+company.inn+', '+company.juradress+', '+(company.bankdetails != null ? company.bankdetails : "[реквизиты не определены]")+' \n' +
        '        </td>\n' +
        '    </tr>\n' +
        '    <tr>\n' +
        '        <td class="header-3 header-left">\n' +
        '            Основание:\n' +
        '        </td>\n' +
        '        <td class="header-3 header-right">\n' +
        '            ПАРТНЕРСКИЙ ДОГОВОР № '+company.dogovor+' от '+getDate(company.dogovordate)+'\n' +
        '        </td>\n' +
        '    </tr>\n' +
        '</table>\n';
    html += '<table border=1 cellpadding=0 cellspacing=0 width=540>\n' +
        '    <thead>\n' +
        '        <tr>\n' +
        '            <th class="c-10">№</th>\n' +
        '            <th>Наименование работ, услуг ['+checkDate+']</th>\n' +
        '            <th class="c-10">Кол-во</th>\n' +
        '            <th class="c-10">Ед.</th>\n' +
        '            <th class="c-15">Цена</th>\n' +
        '            <th class="c-15">Сумма</th>\n' +
        '        </tr>\n' +
        '    </thead>\n' +
        '    <tbody>\n';
    let total = 0;
    let totalDiscount = 0;
    let totalCommission = 0;

    if (detailType === 'detailed') {
        visits.forEach((visit, index)=> {
            total += visit.price;
            let discount = visit.discountUnit === 'percent' ? visit.price * visit.discount / 100 : visit.discount;
            let commission = Number(visit.terminalCommission)/100 * (visit.price - discount);
            totalCommission += commission;
            console.log('commission = '+commission);
            console.log('totalCommission = '+totalCommission);
            totalDiscount += discount;
            html += '        <tr>\n' +
                '            <td>'+(index+1)+'</td>\n' +
                '            <td>Карта Гостя № '+visit.cardNumber+' - '+getDate(visit.date)+'</td>\n' +
                '            <td>1</td>\n' +
                '            <td>руб</td>\n' +
                '            <td>'+visit.price.toFixed(2)+'</td>\n' +
                '            <td>'+visit.price.toFixed(2)+'</td>\n' +
                '        </tr>\n';
        });

        html +=
            '    </tbody>\n' +
            '</table>\n';
    } else {
        visits.forEach((visit, index)=> {
            total += visit.price;
            let discount = visit.discountUnit === 'percent' ? visit.price * visit.discount / 100 : visit.discount;
            let commission = Number(visit.terminalCommission)/100 * (visit.price - discount);
            totalCommission += commission;
            console.log('commission = '+commission);
            console.log('totalCommission = '+totalCommission);
            totalDiscount += discount;

        });
        html += '        <tr>\n' +
            '            <td>1</td>\n' +
            '            <td>Премия организатора согласно ПАРТНЕРСКОГО ДОГОВОРА №'+company.dogovor+' от '+getDate(company.dogovordate)+' ЗА ПЕРИОД  '+ checkDate +'</td>\n' +
            '            <td>'+visits.length+'</td>\n' +
            '            <td>руб</td>\n' +
            '            <td>'+total.toFixed(2)+'</td>\n' +
            '            <td>'+total.toFixed(2)+'</td>\n' +
            '        </tr>\n' +
            '    </tbody>\n' +
            '</table>\n';
    }

    html += '<table border=0 cellpadding=0 cellspacing=0 width=540>\n' +
        '    <tr>\n' +
        '        <td class="header-1 align-right">\n' +
        '            <span class="bold">Итого:</span>     '+total.toFixed(2)+'<br>\n' +
        '            <span class="bold">Без налога (НДС)</span><br>\n' +
        '        </td>\n' +
        '    </tr>\n';
    if (type === 'discount') {
           html +=
               '    <tr>\n' +
               '        <td class="header-1 align-right">\n' +
               '            <span>Сумма скидки Туристу: '+totalDiscount.toFixed(2)+'</span><br>\n' +
               '            <span>Сумма с учетом скидки\t\t\t\t\t'+(total - totalDiscount).toFixed(2)+'</span>\n' +
               '        </td>\n' +
               '    </tr>\n' +
               '    <tr>\n' +
               '        <td class="header-1 align-right">\n' +
               '            <span>К оплате % от суммы скидки: '+(totalCommission).toFixed(2)+'</span>\n' +
               '        </td>\n' +
               '    </tr>\n' +
               '    <tr>\n' +
               '        <td class="header-1 align-left">\n' +
               '            <span>Всего оказано услуг на сумму <b>'+(totalCommission).toFixed(2)+' RUB</b></span>\n' +
               '        </td>\n' +
               '    </tr>\n';

    };
    html +=
        '    <tr>\n' +
        '        <td class="header-1 align-left">\n' +
        '            <span>Вышеперечисленные услуги выполнены полностью и в срок. Заказчик претензий по объему, качеству и срокам оказания услуг не имеет.</span>\n' +
        '        </td>\n' +
        '    </tr>\n' +
        '</table>\n' +
        '<table border=0 cellpadding=0 cellspacing=0 width=540>\n' +
        '    <tr>\n' +
        '        <td class="align-left">\n' +
        '            <span class="bold">ИСПОЛНИТЕЛЬ</span><br>\n' +
        '            <span>Коммерческий директор ООО "КАРТА ГОСТЯ КРЫМА"</span>\n' +
        '        </td>\n' +
        '        <td class="c-5"></td>\n' +
        '        <td class="align-left">\n' +
        '            <span class="bold">ЗАКАЗЧИК</span><br>\n' +
        '            <span>'+company.name+'</span>\n' +
        '        </td>\n' +
        '    </tr>\n' +
        '    <tr>\n' +
        '        <td class="align-left border-bottom pt-20">\n' +
        '        </td>\n' +
        '        <td class="c-5 pt-20"></td>\n' +
        '        <td class="align-left border-bottom pt-20">\n' +
        '        </td>\n' +
        '    </tr>\n' +
        '    <tr>\n' +
        '        <td class="align-left">Ибадходжаев С. С.</td>\n' +
        '        <td class="c-5"></td>\n' +
        '        <td class="align-left"></td>\n' +
        '    </tr>\n' +
        '</table>';


    return html;
};

router.get('/pdf', (req, res, next)=> {

    const dstart = req.query.dstart ? req.query.dstart : '';
    const dend = req.query.dend ? req.query.dend : '';
    const cid = req.query.company ? req.query.company : '';
    const tid = req.query.terminal ? req.query.terminal : '';
    const type = req.query.type ? req.query.type : '';
    const detailType = req.query.detailType ? req.query.detailType : 'all';

    const dstartfull = dstart != '' ? dstart + ' 00:00:00' : '';
    const dendfull = dend != '' ? dend + ' 23:59:59' : '';

    Company.getExtendedById(cid, (err, rows) => {
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/companies/'+cid+'/terminals/'+tid+'/visits');
            return;
        }
        if (rows.length === 0) {
            req.session.error = dict.messages.company_not_found;
            res.redirect('/companies/'+cid+'/terminals/'+tid+'/visits');
            return;
        }
        const company = rows[0];

        Visit.getExtendedForTerminalDate(tid, dstartfull, dendfull, (err, rows) => {
            if (err) {
                req.session.error = dict.messages.db_error+": "+err.message;
                res.redirect('/companies/'+cid+'/terminals/'+tid+'/visits');
                return;
            }

            let visits = rows;
            visits = type !== '' ? visits.filter( elm => elm.type === type.toLowerCase()) : visits;
            console.log(visits);

            var checkDate = '';
            checkDate += dstart != '' ? getDate(dstart)+' - ' : 'н/о -';
            checkDate += dend != '' ? getDate(dend) : ' н/о';

            var datestart = dstart != '' ? getDate(dstart) : 'н/о';
            var dateend = dend != '' ? getDate(dend) : 'н/о';

            var month = dend != '' ? getMonth(dend) : '';

            let content = generateReport(company, visits, type, detailType, checkDate, datestart, dateend, month);

            var pdf = require('html-pdf');

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
                    "contents": '<div style="text-align: center; width: 100%; border-bottom: 1px solid; font-family: sans-serif; font-size: 0.5em;">Акт ('+company.name+') (период: '+checkDate+')</div>'
                },
                "footer": {
                    "height": "20mm",
                    "contents": {
                        // first: 'Cover page',
                        // 2: 'Second page', // Any page number is working. 1-based index
                        default: '<div style="text-align: center; width: 100%; color: #444; border-top: 1px solid; font-family: sans-serif; font-size: 0.5em;"><span>{{page}}</span>/<span>{{pages}}</span></div>', // fallback value
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


        })

    });

});

//JOURNAL

router.get('/journal', (req, res, next)=>{

    var session_message = req.session.message ? req.session.message : null;
    req.session.message = null;
    var session_error = req.session.error ? req.session.error : null;
    req.session.error = null;
    var session_validate_error = req.session.validate_error ? req.session.validate_error : null;
    req.session.validate_error = null;
    let dstart = req.query.dstart ? req.query.dstart : '';
    let dend = req.query.dend ? req.query.dend : '';

    console.log('dstart='+dstart);

    let queryarray = [];
    let dstartfull = '';
    let dendfull = '';
    if (dstart != '') {
        dstartfull = dstart + ' 00:00:00';
        queryarray.push('dstart='+dstart);
    }
    if (dend != '') {
        dendfull = dend +' 23:59:59';
        queryarray.push('dend='+dend);
    }
    let querystr = (dstart != '' || dend != '') ? '?' : '';
    querystr += queryarray.join('&');

    console.log(dstartfull + ' == ' + dendfull);

    Visit.getTotalCount(req.session.user, dstartfull, dendfull, (err, result)=> {
        if (err) {
            req.session.error = 'Company error: '+err.message;
            return res.redirect('/companies');
        }

        var total = result;
        var limit = config.paginationLimit;
        var pagen = req.query.page ? Number(req.query.page) : 1;
        var offset = (pagen-1)*limit;

        Visit.getListWithCompany(req.session.user, offset, limit, dstartfull, dendfull,(err, rows)=>{
            if (err) {
                session_error = 'Visit error: '+err.message;
                //return res.redirect('/companies/journal'+querystr);
            }

            if (!rows.length) {
                session_error = dict.messages.visits_not_found;
            }

            var pageObj = {offset: offset, limit: limit, page: pagen, total: total};
            //console.log(pageObj);
            var pCount = Math.ceil(total/limit);
            console.log(pCount+' '+total+' '+(total/limit));
            pageObj.pages = [];
            for (var i=1; i<=pCount; i++) {
                pageObj.pages.push(i);
            }

            return res.render('visit/journal', {
                pageType: 'companies',
                dict: dict,
                items: rows,
                account: req.session.user,
                dstart: dstart,
                dend: dend,
                message: session_message,
                page: pageObj,
                error: session_error,
                errors: session_validate_error
            });

        })

    });

});

router.get('/journal_pdf', (req, res, next)=> {

    let dstart = req.query.dstart ? req.query.dstart : '';
    let dend = req.query.dend ? req.query.dend : '';
    const type = req.query.type ? req.query.type : '';
    const detailType = req.query.detailType ? req.query.detailType : 'all';

    const dstartfull = dstart != '' ? dstart + ' 00:00:00' : '';
    const dendfull = dend != '' ? dend + ' 23:59:59' : '';

    Visit.getExtended(req.session.user, dstartfull, dendfull,(err, rows) => {
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/companies/journal');
            return;
        }

        let visits = rows;
        visits = type !== '' ? visits.filter( elm => elm.type === type.toLowerCase()) : visits;

        var checkDate = '';

        checkDate += dstart != '' ? getDate(dstart)+' - ' : 'н/о -';
        checkDate += dend != '' ? getDate(dend) : ' н/о';

        let content = generateFullReport(visits, type, detailType, checkDate);

        var pdf = require('html-pdf');

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
                "contents": '<div style="text-align: center; width: 100%; border-bottom: 1px solid; font-family: sans-serif; font-size: 0.7em;">Отчет проходов (период: '+checkDate+')</div>'
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

    })

});

var generateFullReport = (visits, type, detailType, checkDate) => {

    let html = '';

    html += '    <style>\n' +
        '        body {font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10px;}\n' +
        '        table {border-collapse: collapse; table-layout:fixed; font-size: 10px;font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;}\n' +
        '        td, th {vertical-align: middle; padding: 5px; word-wrap:break-word;word-break: break-all;}\n' +
        '        .header-1 {padding: 5px 0}\n' +
        '        .header-2 {padding: 10px 0; font-size: 10px; font-weight: bold;border-bottom: 1px black solid; border-top: 1px black solid;}\n' +
        '        .header-3 {padding: 5px;}\n' +
        '        .header-left {width: 100px;}\n' +
        '        .border-top {border-top: 1px black solid;}\n' +
        '        .border-bottom {border-bottom: 1px black solid;}\n' +
        '        .header-right {font-weight: bold;}\n' +
        '        .bold {font-weight: bold}\n' +
        '        .align-right {text-align: right}\n' +
        '        .align-left {text-align: left}\n' +
        '        .c-5 {width: 5%}\n' +
        '        .c-10 {width: 10%}\n' +
        '        .c-15 {width: 15%}\n' +
        '        .c-20 {width: 20%}\n' +
        '        .pt-10 {padding-top: 10px}\n' +
        '        .pt-20 {padding-top: 20px}\n' +
        '    </style>\n';
    html += '<table border=1 cellpadding=0 cellspacing=0 width=540>\n' +
        '    <thead>\n' +
        '        <tr>\n' +
        '            <th class="c-10">№</th>\n' +
        '            <th>Наименование работ, услуг ['+checkDate+']</th>\n' +
        '            <th class="c-15">Компания</th>\n' +
        '            <th class="c-5">К-во</th>\n' +
        '            <th class="c-10">Ед.</th>\n' +
        '            <th class="c-10">Цена</th>\n' +
        '            <th class="c-15">Сумма</th>\n' +
        '        </tr>\n' +
        '    </thead>\n' +
        '    <tbody>\n';
    let total = 0;
    let totalDiscount = 0;
    let totalCommission = 0;

    if (detailType === 'detailed') {
        visits.forEach((visit, index)=> {
            total += visit.price;
            let discount = visit.discountUnit === 'percent' ? visit.price * visit.discount / 100 : visit.discount;
            let commission = Number(visit.terminalCommission)/100 * (visit.price - discount);
            totalCommission += commission;
            console.log('commission = '+commission);
            console.log('totalCommission = '+totalCommission);
            totalDiscount += discount;
            html += '        <tr>\n' +
                '            <td>'+(index+1)+'</td>\n' +
                '            <td>Карта Гостя № '+visit.cardNumber+' - '+getDate(visit.date)+'</td>\n' +
                '            <td>'+visit.companyName+'</td>\n' +
                '            <td>1</td>\n' +
                '            <td>руб</td>\n' +
                '            <td>'+visit.price.toFixed(2)+'</td>\n' +
                '            <td>'+visit.price.toFixed(2)+'</td>\n' +
                '        </tr>\n';
        });

        html +=
            '    </tbody>\n' +
            '</table>\n';
    } else {
        visits.forEach((visit, index)=> {
            total += visit.price;
            let discount = visit.discountUnit === 'percent' ? visit.price * visit.discount / 100 : visit.discount;
            let commission = Number(visit.terminalCommission)/100 * (visit.price - discount);
            totalCommission += commission;
            console.log('commission = '+commission);
            console.log('totalCommission = '+totalCommission);
            totalDiscount += discount;
        });
        html += '        <tr>\n' +
            '            <td>1</td>\n' +
            '            <td>Премия организатора ЗА ПЕРИОД  '+ checkDate +'</td>\n' +
            '            <td></td>\n' +
            '            <td>'+visits.length+'</td>\n' +
            '            <td>руб</td>\n' +
            '            <td>'+total.toFixed(2)+'</td>\n' +
            '            <td>'+total.toFixed(2)+'</td>\n' +
            '        </tr>\n' +
            '    </tbody>\n' +
            '</table>\n';
    }

    html += '<table border=0 cellpadding=0 cellspacing=0 width=540>\n' +
        '    <tr>\n' +
        '        <td class="header-1 align-right">\n' +
        '            <span class="bold">Итого:</span>     '+total.toFixed(2)+'<br>\n' +
        '            <span class="bold">Без налога (НДС)</span><br>\n' +
        '        </td>\n' +
        '    </tr>\n';
    if (type === 'discount') {
        html +=
            '    <tr>\n' +
            '        <td class="header-1 align-right">\n' +
            '            <span>Сумма скидки Туристу: '+totalDiscount.toFixed(2)+'</span><br>\n' +
            '            <span>Сумма с учетом скидки\t\t\t\t\t'+(total - totalDiscount).toFixed(2)+'</span>\n' +
            '        </td>\n' +
            '    </tr>\n' +
            '    <tr>\n' +
            '        <td class="header-1 align-right">\n' +
            '            <span>К оплате % от суммы скидки: '+(totalCommission).toFixed(2)+'</span>\n' +
            '        </td>\n' +
            '    </tr>\n' +
            '    <tr>\n' +
            '        <td class="header-1 align-left">\n' +
            '            <span>Всего оказано услуг на сумму <b>'+(totalCommission).toFixed(2)+' RUB</b></span>\n' +
            '        </td>\n' +
            '    </tr>\n';

    };

    return html;
};


module.exports = router;
