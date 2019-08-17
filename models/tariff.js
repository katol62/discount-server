var db = require('../misc/db');

var Tariff = {

    getById: (id, done)=>{
        var query = 'SELECT * FROM tariff WHERE id = ?';

        db.query(query, [id], (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })

    },

    getByIdCard: (id, done)=>{
        var query = 'SELECT t.*, c.card FROM tariff t LEFT JOIN tariff_card c ON t.id = c.tariff WHERE t.id = ?';

        db.query(query, [id], (err, rows)=>{
            if (err) {
                return done(err)
            }
            console.log('======');
            console.log(rows);
            console.log('======');
            done(null, rows)
        })

    },

    getForTerminal: (tid, dstart, dend, done)=>{
        var query = 'SELECT t.*, c.card FROM tariff t LEFT JOIN tariff_card c ON t.id = c.tariff WHERE terminal = ?';
        let params = [tid];
        // let query = 'SELECT t.*, ' +
        //     'c.card FROM tariff t ' +
        //     'LEFT JOIN tariff_card c ' +
        //     'ON t.id = c.tariff ' +
        //     'WHERE terminal = ?';
        // if (dstart != '' ) {
        //     query += ' and start >= ? ';
        //     params.push(dstart);
        // }
        // if (dend != '' ) {
        //     query += ' and end <= ? ';
        //     params.push(dend)
        // }
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    create: (body, done)=> {

        var name = body.name;
        var start = (body.start && body.start!=='' ? body.start : null);
        var end = (body.end && body.end!==''? body.end : null);
        var type = body.type;
        var discountType = body.discountType;
        var discount = body.discount;
        var discountUnit = body.discountUnit;
        var price = body.price;;
        var terminal = body.tid;
        var guest = body.guest === 'on' ? '1' : '0';
        var pass = guest=='1' ? body.pass : '0';
        var card = body.card?body.card:null;

        var query = 'INSERT INTO tariff (name, start, end, type, discountType, price, discount, discountUnit, terminal, guest, pass) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM tariff WHERE name = ? AND type = ? AND terminal = ?) LIMIT 1';
        var params = [name, start, end, type, discountType, price, discount, discountUnit, terminal, guest, pass, name, type, terminal];

        db.query(query, params, function(err, rows) {
            if (err) {
                return done(err)
            }

            console.log(card);

            var rowsResult = rows;
            if (card != null) {
                var qr = 'INSERT INTO tariff_card (card, tariff) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM tariff_card WHERE card = ? AND tariff = ?) LIMIT 1';
                var par = [card.card_nb, rows.insertId, card.card_nb, rows.insertId];
                db.query(qr, par, function(err, rows) {
                    if (err) {
                        return done(err)
                    }
                    done(null, rowsResult)
                })
            } else {
                done(null, rowsResult)
            }
        })
    },

    delete: (trid, done)=>{
        //TODO: additional deletes for tariff
        let q = 'DELETE FROM tariff_card WHERE tariff=?';
        db.query(q, [trid], (err, rows)=>{
            var query = 'DELETE FROM tariff WHERE id = ?';
            db.query(query, [trid], (err, rows)=> {
                if (err) {
                    return done(err)
                }
                done(null, rows)
            })
        });
    },
    update: (body, done)=> {

        console.log(body);

        var id = body.id;
        var name = body.name;
        var start = (body.start && body.start!=='' ? body.start : null);
        var end = (body.end && body.end!==''? body.end : null);
        var type = body.type;
        var discount = body.discount;
        var discountType = body.discountType;
        var discountUnit = body.discountUnit;
        var price = body.price;
        var terminal = body.tid;
        var guest = body.guest === 'on' ? '1' : '0';
        var pass = guest=='1' ? body.pass : '0';
        var card = body.card?body.card:null;

        var query = 'UPDATE tariff SET name=?, start=?, end=?, type=?, discountType=?, price=?, discount=?, terminal=?, discountUnit=?, guest=?, pass=? WHERE id=?';
        var params = [name, start, end, type, discountType, price, discount, terminal, discountUnit, guest, pass, id];

        console.log(params);

        db.query(query, params, function(err, rows) {
            var resultRows = rows;
            if (err) {
                return done(err)
            }

            if (card != null) {
                var queryupdate = 'DELETE FROM tariff_card WHERE tariff = ?; INSERT INTO tariff_card (card, tariff) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM tariff_card WHERE card = ? AND tariff = ?) LIMIT 1';
                var paramsupdate = [id, card.card_nb, id, card.card_nb, id];
                db.query(queryupdate, paramsupdate, function(err, rows) {
                    if (err) {
                        return done(err)
                    }
                });
            }
            done(null, resultRows)
        })
    },

};

module.exports = Tariff;
