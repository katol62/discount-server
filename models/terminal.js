var db = require('../misc/db');

var Terminal = {

    getForCompany: (id, done)=>{
        db.query('SELECT * FROM terminal WHERE company = ?', [id], (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    create: (body, done)=>{

        var query = 'INSERT INTO terminal (name, company, place) SELECT ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM terminal WHERE name=?) LIMIT 1';
        var params = [body.name, body.company, body.place, body.name];
        if (body.place === '') {
            query = 'INSERT INTO terminal (name, company) SELECT ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM terminal WHERE name=?) LIMIT 1';
            params = [body.name, body.company, body.name];
        }
        db.query(query, params, (err, rows)=> {
            console.log(rows);
            if (err) {
                return done(err)
            }
            done(null, rows)
        })

    },

    delete: (id, done)=>{
        var query = 'DELETE t.*, r.* FROM terminal t LEFT JOIN reference r ON r.terminal = t.id WHERE t.id = ?';
        db.query(query, [id], (err, rows)=> {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getById: (id, done)=>{
        var query = 'SELECT * FROM terminal WHERE id = ?';
        db.query(query, [id], (err, rows)=> {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    update: (body, done)=>{

        var query = 'UPDATE terminal SET name = ?, company = ?, place = ? WHERE id = ?';
        var params = [body.name, body.cid, body.place, body.tid];
        if (body.place === '') {
            query = 'UPDATE terminal SET name = ?, company = ? WHERE id = ?';
            params = [body.name, body.cid, body.tid];
        }
        db.query(query, params, (err, rows)=> {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })

    },


};

module.exports = Terminal;