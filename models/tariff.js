var db = require('../misc/db');

var Tariff = {

    getById: (id, done)=>{
        var query = 'SELECT * FROM tariff WHERE id = ?';

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

    getForTerminal: (tid, done)=>{
        var query = 'SELECT * FROM tariff WHERE terminal = ?';

        db.query(query, [tid], (err, rows)=>{
            if (err) {
                return done(err)
            }
            console.log(rows);
            done(null, rows)
        })
    },

    create: (body, done)=> {

        var name = body.name;
        var start = (body.start && body.start!=='' ? body.start : '0000-00-00');
        var end = (body.end && body.end!==''? body.end : '0000-00-00');
        var type = body.type;
        var discount = body.discount;
        var terminal = body.tid;
        var guest = body.guest === 'on' ? '1' : '0';
        var pass = guest=='1' ? body.pass : '0';

        console.log('=======')
        console.log(guest)
        console.log('=======')

        var query = 'INSERT INTO tariff (name, start, end, type, discount, terminal, guest, pass) SELECT ?, ?, ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM tariff WHERE name = ? AND type = ? AND terminal = ?) LIMIT 1';
        var params = [name, start, end, type, discount, terminal, guest, pass, name, type, terminal];

        db.query(query, params, function(err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    delete: (trid, done)=>{
        //TODO: additional deletes for tariff
        var query = 'DELETE FROM tariff WHERE id = ?';
        db.query(query, [trid], (err, rows)=> {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },
    update: (body, done)=> {

        console.log(body);

        var id = body.id;
        var name = body.name;
        var start = (body.start && body.start!=='' ? body.start : '0000-00-00');
        var end = (body.end && body.end!==''? body.end : '0000-00-00');
        var type = body.type;
        var discount = body.discount;
        var terminal = body.tid;
        var guest = body.guest === 'on' ? '1' : '0';
        var pass = guest=='1' ? body.pass : '0';

        console.log(guest);

        var query = 'UPDATE tariff SET name=?, start=?, end=?, type=?, discount=?, terminal=?, guest=?, pass=? WHERE id=?';
        var params = [name, start, end, type, discount, terminal, guest, pass, id];

        db.query(query, params, function(err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getForTerminal: (id, done)=>{
        var query = 'SELECT * FROM tariff WHERE terminal = ?';
        db.query(query, [id], (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },


};

module.exports = Tariff;