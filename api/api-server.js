var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var morgan = require('morgan');
var restful = require('node-restful');
var mongoose = restful.mongoose;
var app = express();
var io = require('socket.io-client');
var socket = io('http://127.0.0.1:9000/');

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({type:'application/vnd.api+json'}));
app.use(methodOverride());
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

mongoose.connect("mongodb://localhost/products");

var ProductSchema = mongoose.Schema({
    name: String,
    quantity: Number,
    packageDate: Date,
    expirationDate: Date,
    price: Number,
});
var ShopSchema = mongoose.Schema({
    date: String,
    userId: String,
    items: [ProductSchema]
});

var Shop = app.shop = restful.model('shop', ShopSchema)
    .methods(['get', 'post', 'put', 'delete']);
    Shop.after('post', function(req, res, next) {
        socket.emit('addedProduct', {});
        next();
    })
    Shop.register(app, '/shops');

function compareByExpirationDateASC(item1, item2) {
    return item1.expirationDate < item2.expirationDate;
};

function compareByExpirationDateDSC(item1, item2) {
    return item1.expirationDate > item2.expirationDate;
};

function fetchExpiredItems(userId, rangeDays, callback) {
    let now = new Date();
    let limitDate = new Date();
    rangeDays = new Number(rangeDays);
    limitDate.setDate(limitDate.getDate() + rangeDays);

    console.log('limitDate', limitDate);

    Shop
        .find({userId, items: {$elemMatch: { expirationDate: {$lt: limitDate}}}})
        .exec((error, shops) => {
            let items;

            if (shops) {
                items = shops
                    .reduce((allItems, shop) => {
                        return allItems.concat(shop.items);
                    }, [])
                    .filter((item) => {
                        return item.expirationDate >= now;
                    })
                    .filter((item) => {
                        return item.expirationDate < limitDate;
                    })
                    .sort(compareByExpirationDateDSC);
            }

            callback(error, items);
        });
}

function fetchExpiring(req, res, next) {
    let userId = req.params.userId;
    let rangeDays = req.query.range || 2;

    fetchExpiredItems(userId, rangeDays, (error, expiringItems) => {
        if (error) {
            res.send(error);
        }
        res.send(JSON.stringify(expiringItems, undefined, 4));
    });
}

// user/:userId/products/all
// user/:userId/products/expired
// user/:userId/products/expiring
// user/:userId/products/:productId
app.get('/expiring/:userId/', fetchExpiring);
app.get('/user/:userId/products/expiring', fetchExpiring);
app.get('/user/:userId/products/expired', function fetchExpired(req, res, next) {
    let userId = req.params.userId;
    let limitDate = new Date();

    Shop.find({userId: userId, items: {$elemMatch: {expirationDate: {$lt: limitDate}}}})
        .exec((error, shops) => {
            if (error) {
                res.send(error);
            }

            let items = shops.reduce((allItems, shop) => {
                return allItems.concat(shop.items.filter((item) => item.expirationDate < limitDate));
            }, []);

            items.sort(compareByExpirationDateASC);

            res.send(items);
        });
});

app.get('/notify/:userId', (req, res, next) => {
    let userId = req.params.userId;
    let rangeDays = req.query.range || 2;

    fetchExpiredItems(userId, rangeDays, (error, expiringItems) => {
        if (error) {
            res.send(error);
        }
        socket.emit('expiring', {userId, items: expiringItems});
        res.send(JSON.stringify(expiringItems, undefined, 4));
        next();
    });
});

app.delete('/products/:productId', (req, res, next) => {
    let productId = req.params.productId;

    let shops = Shop.find({items:{$elemMatch: {_id: productId}}});
        shops.exec((error, shops) => {
            console.log('shops ', JSON.stringify(shops, null, 4));
            let shop = shops[0];

            if(shop) {
                let item = shop.items.id(productId);
                item.remove();
                shop.save();
                if (shop.items.length === 0) {
                    shop.remove();
                    console.log('DELETED SHOP', shop);
                }
                shop.save();
                res.send('DELETED: ' + JSON.stringify(item));
            } else {
                res.send(`ITEM: ${productId} not found`);
            }
        });
});

app.listen(3000);
