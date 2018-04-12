var express = require('express');

var router = express.Router();

var config = require('./../../misc/config');
var Card = require('./../../models/card');
var Company = require('./../../models/company');
var Terminal = require('./../../models/terminal');
var locale = require('./../../misc/locale');
var dict = locale[config.locale];


router.get('/', (req, res, next)=>{

    var user = req.decoded;

    console.log(user);

    Company.getAllCompanies(user.role, user.id, (err, rows)=>{

        if (err) {
            return res.status(500).json({ success: false, message: err.message});
        }
        let companies = [];
        var length = rows.length;
        var count = 0;

        rows.forEach((row, index)=>{

            var resRow = row;
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


module.exports = router;
