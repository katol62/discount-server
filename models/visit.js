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

    getExtended: (done)=>{

        var query = 'select v.*,\n' +
            '       ter.name as terminalName,\n' +
            '       tar.name as tariffName,\n' +
            '       tar.discount,\n' +
            '       tar.discountUnit as discountUnit,\n' +
            '       tar.price as totalPrice,\n' +
            '       tar.discountType,\n' +
            '       c.card_nb as cardNumber,\n' +
            '       cm.name as companyName,\n' +
            '       cm.id as companyId,\n' +
            '       u.email from visit v\n' +
            '         left join terminal ter on v.terminal=ter.id\n' +
            '         left join company cm on ter.company=cm.id\n' +
            '         left join tariff tar on v.tariff=tar.id\n' +
            '         left join cards c on v.card=c.id\n' +
            '         left join users u on v.user=u.id\n' +
            'order by v.date DESC';
        db.query(query, (err, rows)=>{
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
    },

    getTotalCount: (user, done)=> {
        let query = 'select id from visit';
        let params = [];
        if (user.role == 'admin' || user.role == 'cashier') {
            query = 'select v.id, v.terminal, t.company, r.company from visit v ' +
            'left join terminal t on v.terminal=t.id ' +
            'left join reference r on t.company=r.company ' +
            'where r.user=?';
            params = [user.id]
        }
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows.length);
        })
    },

    getListWithCompany: (user, offset, limit, done)=> {
        const query =
            'select v.*, ' +
            'ter.name as terminalName, ' +
            ' tar.name as tariffName, ' +
            ' tar.discount, ' +
            ' tar.discountUnit as discountUnit, ' +
            ' tar.price as totalPrice,' +
            ' tar.discountType, ' +
            ' ter.company as terminalCompany, ' +
            ' c.card_nb as cardNumber, ' +
            ' cm.name as companyName,' +
            ' cm.id as companyId,' +
            ' u.email from visit v' +
            ' left join terminal ter on v.terminal=ter.id' +
            ' left join company cm on ter.company=cm.id' +
            ' left join tariff tar on v.tariff=tar.id' +
            ' left join cards c on v.card=c.id' +
            ' left join users u on v.user=u.id' +
            ' order by v.date DESC' +
            ' LIMIT ? OFFSET ?';
        let params = [limit, offset];
        console.log(query);
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err);
            }
            done(null, rows);
        })

    }


};

module.exports = Visit;