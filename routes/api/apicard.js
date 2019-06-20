var express = require('express');

var router = express.Router();

var config = require('./../../misc/config')
var Card = require('./../../models/card');
var locale = require('./../../misc/locale');
var dict = locale[config.locale];


router.get('/', (req, res, next)=> {
    var decoded = req.decoded;

    console.log(decoded);

    res.json({success:true});
});

router.post('/verify', (req, res, next)=>{

    let user = req.decoded;

    let inputcards = req.body.cards;
    console.log(inputcards);
    Card.validateCards(inputcards, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message});
        }

        let cards = [];
        rows.forEach((row)=> {
            let resRow = {card_nb: row.card_nb, status: (row.status == 'published' ? 'ok' : row.status)};
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

module.exports = router;
