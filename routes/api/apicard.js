var express = require('express');

var router = express.Router();

var config = require('./../../misc/config');
var Card = require('./../../models/card');
var locale = require('./../../misc/locale');
var globals = require('./../../misc/globals');
var dict = locale[config.locale];


router.get('/', (req, res, next)=> {
    var decoded = req.decoded;

    console.log(decoded);

    res.json({success:true});
});

router.post('/sell', (req, res, next)=> {
    let user = req.decoded;
    let card = req.body.card;
    Card.getByIdOrNumberForUser(card, user.id, (err, rows)=>{

        if (err) {
            return res.status(500).json({ success: false, message: err.message});
        }
        if (rows.length == 0) {
            return res.status(404).json({ success: false, message: dict.messages.card_not_found_or_not_allowed});
        }

        let card = rows[0];
        var card_number = card.card_nb;
        var card_id = card.id;
        let passCount = globals.methods.getPassLimit(card.pass);

        const overdue = card.pass_count + 1 > card.pass && card.pass_total >= Number(passCount);

        console.log(card);
        console.log('passCount:: '+passCount);
        console.log('status:: '+card.status);
        console.log('overdue:: '+overdue);

        if (rows[0].status != 'published') {
            if (!overdue) {
                return res.status(200).json({ success: false, card: {id: card_id, card_number: card_number}, message: dict.messages.card_already_sold+": "+card_number});
            }
        }
        var body = req.body;
        body.id = rows[0].id;
        body.status = 'sold';
        body.overdue = overdue;
        body.updatedBy = user.id;
        body.updated = require('moment')().format('YYYY-MM-DD HH:mm:ss');
        body.created = require('moment')().format('YYYY-MM-DD HH:mm:ss');

        if (overdue && Number(card.pass) !== 0) {
            Card.resetPass(body, (err, rows) => {
                if (err) {
                    return res.status(500).json({ success: false, message: err.message});
                }
                if (rows.affectedRows == 0) {
                    return res.status(200).json({ success: false, card: {id: card_id, card_number: card_number}, message: dict.messages.card_sell_error});
                }

                Card.sell(body, (err, rows)=>{
                    if (err) {
                        return res.status(500).json({ success: false, message: err.message});
                    }
                    if (rows.affectedRows == 0) {
                        return res.status(200).json({ success: false, message: dict.messages.card_sell_error});
                    }
                    return res.status(200).json({ success: true, card: {id: card_id, card_number: card_number}, message: dict.messages.card_sold+": "+card_number});
                })

            })
        } else {
            Card.sell(body, (err, rows)=>{
                if (err) {
                    return res.status(500).json({ success: false, message: err.message});
                }
                if (rows.affectedRows == 0) {
                    return res.status(200).json({ success: false, message: dict.messages.card_sell_error});
                }
                Card.registerPass(body, (err, rows) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: err.message});
                    }
                    if (rows.affectedRows == 0) {
                        return res.status(200).json({ success: false, message: dict.messages.card_sell_error});
                    }
                    return res.status(200).json({ success: true, card: {id: card_id, card_number: card_number}, message: dict.messages.card_sold+": "+card_number});
                })
            })
        }


    })
});

router.post('/verify', (req, res, next)=>{

    let user = req.decoded;

    let inputcards = req.body.cards;
    Card.validateCards(inputcards, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message});
        }

        let cards = [];
        rows.forEach((row)=> {
            let limit = globals.methods.getPassLimit(row.pass);
            let remains = Number(limit) - Number(row.pass_total);
            let resRow = {card_nb: row.card_nb, status: (row.status == 'published' ? 'ok' : row.status), type: row.type, pass: row.pass, pass_count: row.pass_count, pass_total: row.pass_total, pass_limit: limit, remains: remains};
            cards.push(resRow);
        });

        return res.status(200).json({
            success: true,
            cards: cards
        });
    });
});

router.post('/exchange', (req, res, next)=>{

    let user = req.decoded;

    let inputCards = req.body.cards;
    let outputCards = [];
    let count = 0;

    inputCards.forEach( (inputCard)=> {
        let body = inputCard;
        body.status = 'sold';
        body.updatedBy = user.id;
        body.updated = require('moment')().format('YYYY-MM-DD HH:mm:ss');

        Card.exchangeCards( body, (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message});
            }
            let status = (rows.affectedRows === 0) ? 'error' : 'ok';
            let outputCard = {card_nb: inputCard.card_nb, status: status }
            outputCards.push(outputCard);

            if (inputCards.length == outputCards.length) {
                return res.status(200).json({
                    success: true,
                    cards: outputCards
                });
            }
        })

    });

});

router.post('/sellpass', (req, res, next)=>{

    let user = req.decoded;

    let inputCard = req.body;

    Card.getByIdOrNumberForUser(inputCard.card, user.id, (err, rows)=>{

        if (err) {
            return res.status(500).json({ success: false, message: err.message});
        }
        if (rows.length == 0) {
            return res.status(404).json({ success: false, message: dict.messages.card_not_found_or_not_allowed});
        }

        let card = rows[0];
        card.passCount = globals.methods.getPassLimit(card.pass);

        console.log(card);

        Card.checkExpired(card, (err, result)=>{

            if (err) {
                return res.status(500).json({ success: false, message: err.message});
            }

            Card.getByIdOrNumberForUser(inputCard.card, user.id, (err, rows)=>{

                if (err) {
                    return res.status(500).json({ success: false, message: err.message});
                }
                if (rows.length == 0) {
                    return res.status(404).json({ success: false, message: dict.messages.card_not_found_or_not_allowed});
                }

                let card = rows[0];
                var card_number = card.card_nb;
                var card_id = card.id;

                if (card.status == 'published') {
                    return res.status(200).json({ success: false, card: {id: card_id, card_number: card_number}, message: dict.messages.card_not_sold+": "+card_number});
                }
                if (card.status == 'overdue' || card.status == 'blocked') {
                    return res.status(200).json({ success: false, card: {id: card_id, card_number: card_number}, message: dict.messages.card_pass_invalid+": "+card_number});
                }

                var body = req.body;
                body.id = rows[0].id;
                body.status = 'sold';
                body.pass = Number(card.pass) + Number(inputCard.days);
                body.updatedBy = user.id;
                body.updated = require('moment')().format('YYYY-MM-DD HH:mm:ss');
                body.created = require('moment')().format('YYYY-MM-DD HH:mm:ss');

                Card.sell(body, (err, rows)=>{
                    if (err) {
                        return res.status(500).json({ success: false, message: err.message});
                    }
                    if (rows.affectedRows == 0) {
                        return res.status(200).json({ success: false, message: dict.messages.card_pass_update_error});
                    }
                    Card.registerPass(body, (err, rows) => {
                        if (err) {
                            return res.status(500).json({ success: false, message: err.message});
                        }
                        if (rows.affectedRows == 0) {
                            return res.status(200).json({ success: false, message: dict.messages.card_pass_update_error});
                        }
                        return res.status(200).json({ success: true, card: {id: card_id, card_number: card_number, days: inputCard.days}, message: dict.messages.card_pass_sold+": "+card_number});
                    })
                })
            })
        })
    })
});

module.exports = router;
