var db = require('../misc/db');

var Company = {

    getAllCompanies: (role, id, done) => {

        var query = 'SELECT * FROM company order by name';
        var params = [];
        if (role === 'admin') {
            query = 'SELECT * from company WHERE owner = ? order by name';
            params = [id];
        }
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    create: (body, done)=> {

        console.log('nds='+body.nds);
        var params = [body.name, body.fullname, body.inn, body.kpp, body.ogrn, body.juradress, body.adress, body.nds, body.dogovor, body.dogovordate, body.owner, body.country, body.foc, body.region, body.name, body.region];

        db.query('INSERT INTO company (name, fullname, inn, kpp, ogrn, juradress, adress, nds, dogovor, dogovordate, owner, country, foc, region) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT * FROM company WHERE name=? AND region = ?) LIMIT 1', params, (err, rows)=> {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getById: function (id, done) {
        db.query('SELECT * from company WHERE id = ?', [id], function (err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },


    getExtendedById: function (id, done) {
        var query = 'select c.id, c.name, c.owner, c.region, state.name as countryname, foc.name as focname, region.name as regionname from company c join loc_states state on c.country = state.id join loc_fos foc on c.foc = foc.id join loc_regions region on c.region = region.id where c.id = ?';
        db.query(query, [id], function (err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getExtendedByIdAndOwner: function (id, owner, done) {
        var query = 'select c.id, c.name, c.owner, c.region, state.name as countryname, foc.name as focname, region.name as regionname from company c join loc_states state on c.country = state.id join loc_fos foc on c.foc = foc.id join loc_regions region on c.region = region.id where c.id = ?';
        var params = [id];
        if (owner.role === 'admin') {
            query = 'select c.id, c.name, c.owner, c.region, state.name as countryname, foc.name as focname, region.name as regionname from company c join loc_states state on c.country = state.id join loc_fos foc on c.foc = foc.id join loc_regions region on c.region = region.id where c.id = ? and c.owner = ?';
            params = [id, owner.id];
            console.log(query);
            console.log(params);
        }
        db.query(query, params, function (err, rows) {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getCompaniesTerminals: (owner, done)=>{
        var query = 'SELECT * from company WHERE owner = ? order by name';
        db.query(query, [owner], (err, rows)=> {
            if (err) {
                return done(err)
            }

            if (rows.length == 0) {
                return done(null, rows)
            }

            var resultRows = [];
            var count = 0;
            var length = rows.length;
            rows.forEach((row, index)=>{
                var resRow = row;
                resRow.terminals = [];
                count++;

                db.query('SELECT * from terminal WHERE company = ? order by name', [resRow.id], (err, rows)=>{
                    if (err) {
                        return done(err)
                    }
                    resRow.terminals = rows;
                    resultRows[index] = resRow;

                    if (count == length) {
                        return done(null, resultRows);
                    }
                })
            })
        })
    },

    getCompaniesForOwner: (owner, done)=>{
        var query = 'SELECT * from company WHERE owner = ?';
        db.query(query, [owner], (err, rows)=> {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getCompaniesForId: (id, done)=>{
        var query = 'SELECT * from company WHERE owner = (SELECT owner from company WHERE id = ?)';
        db.query(query, [id], (err, rows)=> {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getCompaniesForParent: (id, done)=>{
        var query = 'SELECT * from company WHERE owner IN ((SELECT id from users WHERE parent = ?))';
        db.query(query, [id], (err, rows)=> {
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    getTerminals: (owner, cid, done)=>{
        var query = 'SELECT * from company WHERE owner = ? AND id = ?';
        db.query(query, [owner], (err, rows)=> {
            if (err) {
                return done(err)
            }

            if (rows.length == 0) {
                return done(null, rows)
            }

            var resultRows = [];
            var count = 0;
            var length = rows.length;
            rows.forEach((row, index)=>{
                var resRow = row;
                resRow.terminals = [];
                count++;

                db.query('SELECT * from terminal WHERE company = ?', [resRow.id], (err, rows)=>{
                    if (err) {
                        return done(err)
                    }
                    resRow.terminals = rows;
                    resultRows.push(resRow);

                    if (count == length) {
                        return done(null, resultRows);
                    }
                })
            })
        })
    },

    delete: (id, done)=>{
        var query = 'DELETE с.*, t.*, r.* FROM company с LEFT JOIN terminal t ON t.company = с.id LEFT JOIN reference r ON r.terminal = с.id WHERE с.id = ?';
        db.query(query, [id], (err, rows)=> {
            console.log(rows);
            if (err) {
                return done(err)
            }
            done(null, rows)
        })
    },

    update: (body, done)=> {

        console.log(body);
        var query = 'UPDATE company SET name=?, fullname=?, inn=?, kpp=?, ogrn=?, juradress=?, adress=?, nds=?, dogovor=?, dogovordate=?, country = ?, foc = ?, region = ?, owner = ? WHERE id = ?';
        var params = [body.name, body.fullname, body.inn, body.kpp, body.ogrn, body.juradress, body.adress, body.nds, body.dogovor, body.dogovordate, body.country, body.foc, body.region, body.owner, body.id];
        db.query(query, params, (err, rows)=>{
            if (err) {
                return done(err)
            }
            done(null, rows)
        })

    }
};

module.exports = Company;