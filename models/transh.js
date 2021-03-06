var db = require('../misc/db');

var Transh = {

    getTotalForOwner: (owner, pagination = null, done) => {
        let params = [];
        let whereArray = [];
        let queryTotal = 'SELECT count(*) as count from transh';
        if (owner.role === 'admin' || owner.role === 'partner') {
            whereArray.push('owner = ?');
            params.push(owner.id);
        }
        db.query(queryTotal, params, (err, rows)=>{
            if (err) {
                return (done(err));
            }
            let resultObj = {total: rows[0].count};
            let query = 'select t.*, c.card_nb as number from transh as t, cards as c where c.id = t.start'

            if (whereArray.length) {
                const whereAdd = whereArray.join(' & ');
                query += '&' + whereAdd;
            }

            if (pagination !== null) {
                query += ' LIMIT ? OFFSET ?';
                params.push(pagination.limit);
                params.push(pagination.offset);
            }

            console.log(query);
            console.log( params);

            db.query(query, params, (err, rows) => {
                if (err) {
                    return (done(err));
                }
                resultObj.items = rows;
                done(null, resultObj);
            })
        })

    },

    getAllByOwner: (owner, done)=>{
        var query = 'SELECT t.id, t.start, t.count, t.owner, u.id as ownerId, u.name, u.last, u.email, u.role, u.parent, u.publisher, c.card_nb as number FROM transh t LEFT JOIN users u ON t.owner=u.id LEFT JOIN cards c ON c.card_nb = (SELECT c1.card_nb FROM cards as c1 WHERE t.id=c1.transh ORDER BY c1.card_nb LIMIT 1)';
        var params = [];
        if (owner.role === 'admin' || owner.role === 'partner') {
            query = 'SELECT t.id, t.start, t.count, t.owner, u.id as ownerId, u.name, u.last, u.email, u.role, u.parent, u.publisher, c.card_nb as number FROM transh t LEFT JOIN users u ON t.owner=u.id LEFT JOIN cards c ON c.card_nb = (SELECT c1.card_nb FROM cards as c1 WHERE t.id=c1.transh ORDER BY c1.card_nb LIMIT 1) WHERE t.owner=?';
            params = [owner.id];
        }

        db.query(query, params, (err, rows)=>{
            if (err) {
                return (done(err));
            }
            done(null, rows);
        })
    },

    getAll: (owner, done)=>{
        let query = 'select t.*, c.card_nb as number from transh as t, cards as c where c.id = t.start';

        // var query = 'SELECT t.id, t.start, t.count, t.owner, u.id as ownerId, u.name, u.last, u.email, u.role, u.parent, u.publisher, c.card_nb as number FROM transh t LEFT JOIN users u ON t.owner=u.id LEFT JOIN cards c ON c.card_nb = (SELECT c1.card_nb FROM cards as c1 WHERE t.id=c1.transh ORDER BY c1.card_nb LIMIT 1)';
        var params = [];

        db.query(query, params, (err, rows)=>{
            if (err) {
                return (done(err));
            }
            done(null, rows);
        })
    },

    createTransh: (body, done)=> {
        var query = 'INSERT INTO transh (start, count, owner, external) VALUES (?, ?, ?, ?)';
        var params = [body.start, body.count, body.owner, body.external=='on'?'1':'0'];
        db.query(query, params, (err, rows)=>{
            if (err) {
                return (done(err));
            }
            done(null, rows);
        })
    },

    updateTransh: (body, done)=> {
        const owner = (body.admin && body.admin!='')?body.admin:body.owner;
        const external = body.external=='on'?'1':'0';
        const query = 'UPDATE transh set owner=?, external=? WHERE id = ?';
        const params = [owner, external, body.id];
        db.query(query, params, (err, rows)=>{
            if (err) {
                return (done(err));
            }
            done(null, rows);
        })
    },

    updateTranshOwner: (body, done)=> {
        const owner = body.owner;
        const transhId = body.transhId;
        const query = 'UPDATE transh t INNER JOIN cards c ON t.id = c.transh ' +
            'SET t.owner = ?, c.owner = ? ' +
            'WHERE t.id = ?';
        const params = [owner, owner, transhId];

        console.log(query);
        console.log(params);

        db.query(query, params, (err, rows)=>{
            if (err) {
                return (done(err));
            }
            done(null, rows);
        })
    },

    getTransh: (id, done)=>{
        var query = 'SELECT t.id, t.owner, t.external, t.count, c.card_nb, c.type, c.status, c.lifetime, c.servicetime, c.company_id, c.test FROM cards c JOIN transh t on c.transh=t.id WHERE t.id = ? ORDER BY c.id LIMIT 1';
        db.query(query, [id], (err, rows)=>{
            if (err) {
                return (done(err));
            }
            done(null, rows);
        })

    },

};

module.exports = Transh;
