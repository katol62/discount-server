var db = require('../misc/db');

var Visit = {

    getExtendedForTerminal: (trid, done)=>{

        var query = 'select v.*, ter.name as terminalName, tar.name as tariffName, tar.discount, tar.discountUnit as discountUnit, tar.price as totalPrice, tar.discountType, c.card_nb as cardNumber, u.email from visit v left join terminal ter on v.terminal=ter.id left join tariff tar on v.tariff=tar.id left join cards c on v.card=c.id left join users u on v.user=u.id where v.terminal=? order by v.date DESC';
        db.query(query, [trid], (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    },

    add: (body, done)=> {
        var query = 'INSERT INTO visit (date, terminal, card, tariff, type, price, user) VALUES (?, ?, ?, ?, ?, ?, ?)';
        var params = [body.created, body.tid, body.card, body.tariff, body.type, body.price, body.user];
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    },

    checkExists: (id, done)=>{
        db.query('SELECT * FROM visit WHERE card = ?', [id], (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })
    }


};

module.exports = Visit;