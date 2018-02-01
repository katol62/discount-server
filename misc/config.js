var locale = require('./locale');
var dict = locale.ru;

module.exports = {

    'server': {
        host: 'localhost',
        port: 3000
    },
    'locale': 'ru',
    'secret': 'Mxmbawlx50XOpKkUMcY2wNjoRmU06g3ComNXJfxfnyt9ESuAKSQxe8FXG',
    'sessionSecret': '2dgiEtWdUxbqK9hZ9sWZ4KdGwI5pRmQo0xivuMlh5G2f0ZBco2eDPEZ269Mg',
    'roles': ['super', 'admin', 'cashier'],
    'paginationLimit': 10,
    'tariffTypes': [
        {id:'adult', name:dict.labels.label_tariff_adult},
        {id:'child', name:dict.labels.label_tariff_child},
        {id:'other', name:dict.labels.label_tariff_other}
    ],
    'cardStatus': [
        {id:'published', name: dict.labels.label_status_published},
        {id:'sold', name: dict.labels.label_status_sold},
        {id:'activated', name: dict.labels.label_status_activated},
        {id:'overdue', name: dict.labels.label_status_overdue},
        {id:'blocked', name: dict.labels.label_status_blocked}
    ],
    "discountTypes": [
        {id: 'pass', name: dict.labels.label_pass},
        {id: 'discount', name: dict.labels.label_discount},
    ],
    'passType': [{id: '0', name: dict.labels.label_no_day},{id: '1', name: dict.labels.label_one_day},{id: '3', name: dict.labels.label_three_days},{id: '6', name: dict.labels.label_six_days}],
    'passTypeStrict': [{id: '1', name: dict.labels.label_one_day},{id: '3', name: dict.labels.label_three_days},{id: '6', name: dict.labels.label_six_days}]
};
