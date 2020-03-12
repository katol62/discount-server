var locale = require('./locale');
var dict = locale.ru;

module.exports = {

    'server': {
        host: 'taisgroup.ru',
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
        {id:'group', name:dict.labels.label_tariff_group},
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
    // 'passType': [{id: '0', name: dict.labels.label_zero_day},{id: '1', name: dict.labels.label_one_day},{id: '3', name: dict.labels.label_three_days},{id: '6', name: dict.labels.label_six_days}],
    'passType': [{id: '0', name: dict.labels.label_zero_day},{id: '1', name: dict.labels.label_pass}],
    'passTypeStrict': [{id: '1', name: dict.labels.label_one_day},{id: '3', name: dict.labels.label_three_days},{id: '6', name: dict.labels.label_six_days}],
    'discountUtits': [
        {id:'currency', name:'руб.'},
        {id:'percent', name:'%'}
    ],
    'filters': [{id: 'id', name: 'ID'}, {id: 'qr_code', name: 'QR Code'},{id: 'nfs_code', name: 'NFS Code'},{id: 'm_code', name: 'M-Code'},{id: 'card_nb', name: dict.labels.label_card_number},{id: 'prim', name: dict.labels.label_card_prim}],

    'pass': [{days: 1, count: 5},{days: 3, count: 12},{days: 6, count: 25}],

    expireDays: 31,
    tokenExpireIn: 86400 // expires in 24 hours

};
