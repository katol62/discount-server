var express = require('express');

var router = express.Router();

var config = require('./../../misc/config');
var Company = require('./../../models/company');
var Terminal = require('./../../models/terminal');
var Tariff = require('./../../models/tariff');
var Card = require('./../../models/card');
var Visit = require('./../../models/visit');
var locale = require('./../../misc/locale');
var dict = locale[config.locale];

router.get('/', (req, res, next)=>{
    return res.status(404).json({ success: false, message: 'Not allowed' });
});

router.post('/', (req, res, next)=>{
    return res.status(404).json({ success: false, message: 'Not allowed' });
});

router.get('/companies', (req, res, next)=>{

    let user = req.decoded;

    console.log(user);

    Company.getAllCompanies(user.role, user.id, (err, rows)=>{

        if (err) {
            return res.status(500).json({ success: false, message: err.message});
        }
        let companies = [];
        const length = rows.length;
        let count = 0;

        rows.forEach((row, index)=>{

            let resRow = row;
            resRow.terminals = [];

            Terminal.getForCompany(resRow.id, (err, rows)=>{
                count++;
                if (err) {
                    return res.status(500).json({ success: false, message: err.message});
                } else {
                    resRow.terminals = rows;
                    companies[index] = resRow;

                    if (count == length) {
                        return res.status(200).json({
                            success: true,
                            message: 'Company list successfully recieved',
                            user: user,
                            companies: companies
                        });
                    }
                }
            })
        })
    });
});

router.get('/tariffs/:tid', (req, res, next)=>{

    let user = req.decoded;
    let tid = req.params.tid;

    console.log(user);

    if (!tid) {
        return res.status(500).json({ success: false, message: "Parameters missing"});
    }

    Tariff.getForTerminal(tid, (err, rows)=>{
        if (err) {
            return res.status(500).json({ success: false, message: err.message});
        }

        return res.status(200).json({
            success: true,
            message: 'Tariffs for terminal '+tid,
            tariffs: rows
        });
    });
});

router.post('/visit', (req, res, next)=>{

    let user = req.decoded;

    let trid = req.body.tariff_id;
    let tid = req.body.terminal_id;
    let sum = req.body.sum;

    let card = null;
    if (req.body.card_id) {
        card = card === null ? {} : card;
        card.id = req.body.card_id;
    }
    if (req.body.card_nb) {
        card = card === null ? {} : card;
        card.card_nb = req.body.card_nb;
    }
    if (req.body.qr_code) {
        card = card === null ? {} : card;
        card.qr_code = req.body.qr_code;
    }
    if (req.body.nfs_code) {
        card = card === null ? {} : card;
        card.nfs_code = req.body.nfs_code;
    }

    if (!tid || !card || !trid) {
        return res.status(500).json({ success: false, message: "Parameters missing"});
    }

    Card.getByCardForUser(card, user, (err, rows)=>{
        if (err) {
            return res.status(500).json({ success: false, message: err.message});
        }
        if (rows.length == 0) {
            return res.status(404).json({ success: false, message: 'Card not found' });
        }

        let card = rows[0];
        let cardId = rows[0].id;

        Tariff.getById(trid, (err, rows)=>{
            if (err) {
                return res.status(500).json({ success: false, message: err.message});
            }
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Tariff not found' });
            }
            let tariff = rows[0];

            console.log(card);

            Card.checkExpired(card, (err, result)=>{
                if (err) {
                    return res.status(500).json({ success: false, message: err.message});
                }
                let price = sum !== null ? sum : tariff.price;
                var body = {type: tariff.discountType, price: price, tariff: tariff.id, tid:tid};
                body.card = cardId;
                body.user = user.id;
                body.date = require('moment')().format('YYYY-MM-DD HH:mm:ss');
                body.created = require('moment')().format('YYYY-MM-DD HH:mm:ss');

                Card.checkValidity(body, card, (err, result)=>{

                    if (err) {
                        return res.status(500).json({ success: false, message: err.message});
                    }
                    if (!result.success) {
                        return res.status(200).json({ success: false, message: 'Card ('+card.card_nb+') expired. Details: '+result.message });
                    }

                    if (card.status !== 'sold') {

                        var sellBody = {};
                        sellBody.id = card.id;
                        sellBody.status = 'sold';
                        sellBody.updatedBy = user.id;
                        sellBody.updated = require('moment')().format('YYYY-MM-DD HH:mm:ss');
                        sellBody.pass = tariff.pass;
                        sellBody.type = tariff.type;

                        Card.sell(sellBody, (err, rows)=>{
                            if (err) {
                                return res.status(500).json({ success: false, message: err.message});
                            }
                            if (rows.length == 0) {
                                return res.status(200).json({ success: false, message: 'Card not sold' });
                            }
                            Visit.add(body, (err, rows)=>{
                                if (err) {
                                    return res.status(500).json({ success: false, message: err.message});
                                }
                                if (rows.affectedRows == 0) {
                                    return res.status(200).json({ success: false, message: 'Visit not added' });
                                }
                                return res.status(200).json({
                                    success: true,
                                    message: 'Visit added',
                                    visit: rows.insertId
                                });
                            })
                        })
                    } else {
                        Visit.add(body, (err, rows)=>{
                            if (err) {
                                return res.status(500).json({ success: false, message: err.message});
                            }
                            if (rows.affectedRows == 0) {
                                return res.status(200).json({ success: false, message: 'Visit not added' });
                            }
                            return res.status(200).json({
                                success: true,
                                message: 'Visit added',
                                visit: rows.insertId
                            });
                        })
                    }
                })
            });

        });
    });

});


module.exports = router;
