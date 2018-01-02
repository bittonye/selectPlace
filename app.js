#! /usr/bin/env node

var fs = require('fs')
var Distance = require('geo-distance');
var jsonfile = require('jsonfile')
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var async = require('async');

var url = 'mongodb://localhost:27017/citiesDB';

var googleMapsClient = require('@google/maps').createClient({
    key: 'AIzaSyCcKg9wc-fAhpjIp9uyy7MZoHryNxfg77k'
});

var findDocuments = function(db, callback) {
    // Get the documents collection
    var collection = db.collection('towns');
    // Find some documents
    collection.find().toArray(function(err, docs) {
        assert.equal(err, null);
        callback(docs);
    });
}

var findTowns = function(db, towns, rootCB) {
    var resTowns = [];
    async.each(towns, function(town, callback) {
        var collection = db.collection('towns');
        collection.find({ name: town }).toArray(function(err, resTown) {
            assert.equal(err, null);
            resTowns.push(resTown)
            callback();
        });
    }, function(err) {
        if( err ) {
          console.log('A file failed to process');
        } else {
          rootCB(resTowns);
        }
    });
}


function checkAround(town, towns) {
    resTowns = [];
    for (var i = 0; i < towns.length; i++) {
        let town2 = towns[i];
        let town2Dist = Distance.between(town, town2);
        town2.distance = town2Dist.human_readable();
        if (town2Dist <= Distance('25 km')) {
            resTowns.push( {
                name: town2.name,
                distance: town2.distance + ""
            });
        }
    }
    return resTowns;
}

var checkTowns = ['Beersheba', 'Ashdod', 'Reẖovot', 'Tel Aviv', 'Kfar Saba', 'Herzliya', 'Netanya'];

let aroundTowns = {};

MongoClient.connect(url, function(err, db) {
    findTowns(db, checkTowns, function(checkAroundTowns) {
        findDocuments(db, function(towns) {
            async.each(checkAroundTowns, function(town, callback) {
                town = town[0];
                aroundTowns[town.name] = checkAround(town, towns);
                callback();
            },
            function(err) {
                for(var prop in aroundTowns) {
                    jsonfile.writeFileSync(prop, aroundTowns[prop]);
                }
                db.close();
            });
        })
    })
});

