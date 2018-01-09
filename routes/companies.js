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
var log = require('npmlog');
var bcrypt = require('bcrypt');

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

            rows.forEach((row, index)=>{

                var resRow = row;
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

                        if (count == length) {
                            return res.render('company/list', {
                                pageType: 'companies',
                                dict: dict,
                                account: req.session.user,
                                items: resultRows,
                                message: session_message,
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
    req.checkBody('type', dict.messages.terminal_type_required).notEmpty();

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
    req.checkBody('type', dict.messages.terminal_type_required).notEmpty();

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

            var tid = req.body.tid ? req.body.tid : '0';
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

router.post('/:cid/terminals/:tid/tariffs/create', (req, res, next)=> {

    req.checkBody('name', dict.messages.tariff_name_required).notEmpty();
    req.checkBody('type', dict.messages.tariff_type_required).notEmpty();
    req.checkBody('discount', dict.messages.tariff_discount_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
        return;
    }
    Tariff.create(req.body, (err, rows)=>{
        if (err) {
            req.session.error = dict.messages.db_error+": "+err.message;
            res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
            return;
        }
        if (rows.affectedRows === 0) {
            req.session.error = dict.messages.tariff_create_error;
            res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/create');
            return;
        }
        req.session.message = dict.messages.tariff_created;
        res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs');
        return;
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

                Tariff.getById(req.params.trid, (err, rows)=>{
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

router.put('/:cid/terminals/:tid/tariffs/:trid/edit', (req, res, next)=>{

    req.checkBody('name', dict.messages.tariff_name_required).notEmpty();
    req.checkBody('type', dict.messages.tariff_type_required).notEmpty();
    req.checkBody('discount', dict.messages.tariff_discount_required).notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.session.validate_error = errors;
        res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/tariffs/'+req.params.trid+'/edit');
        return;
    }
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
                    passes: config.passTypeStrict,
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

router.post('/:cid/terminals/:tid/visits/add', (req, res, next)=> {
    req.checkBody('card', dict.messages.visit_card_number_required).notEmpty();
    req.checkBody('tariff', dict.messages.visit_tariff_required).notEmpty();
    req.checkBody('price', dict.messages.tariff_discount_required).notEmpty();

    var errors = req.validationErrors();

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
        if (rows.length == 0) {
            req.session.error = dict.messages.card_not_found;
            return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
        }
        var body = req.body;
        body.card = rows[0].id;
        body.user = req.session.user.id;
        body.created = require('moment')().format('YYYY-MM-DD HH:mm:ss');
        console.log(body);

        if (body.pass && body.pass !== '0') {
            Card.updateStatus({id: body.card, pass: body.pass, status: 'sold'}, (err, rows)=>{
                if (err) {
                    req.session.error = dict.messages.db_error+': '+err.message;
                    return res.redirect('/companies/'+req.params.cid+'/terminals/'+req.params.tid+'/visits/add');
                }
                if (rows.length == 0) {
                    req.session.error = dict.messages.card_update_error;
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
            })
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


module.exports = router;
