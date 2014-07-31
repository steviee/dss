'use strict';

/*

 What's the plan?

 store files in a storage (redis/mongodb/...)
 generate images and thumbnails of documents on import and store them along
 generate meta-data (JSON) on import and store it along
 make meta-data searchable (filename, category, date, ...)

 */
var mongo = require('mongodb'),
    Db = mongo.Db,
    Grid = mongo.Grid,
    mime = require('mime'),
    fs = require('fs'),
    walk = require('walk'),
    files = [],
    sha1 = require('sha1'),
    path = require('path'),
    calls_running = 0;

var storeFile = function (fileName, db) {
    var grid = new Grid(db, 'files');

    var fileKey = sha1(fileName);
    console.log("  => Using key: " + fileKey);

    var file = fs.readFileSync(fileName);
    var mimeType = mime.lookup(fileName);
    var baseName = path.basename(fileName);

    calls_running += 1;
    grid.put(file, { filename: baseName ,content_type: mimeType }, function () {
        calls_running -= 1;
        console.log("  => Done.");
    });
};

fs.watch('./inbound', function (event, fileName) {
    if (fileName) {
        console.log('New file found: ' + fileName);
        storeFile(fileName);
    }
});

Db.connect('mongodb://localhost:27017/exampleDb', function (err, db) {

    console.log("Connected to MongoDb!");

    // Walker options
    var walker = walk.walk('./inbound', { followLinks: false });

    walker.on('file', function (root, stat, next) {
        // Add this file to the list of files
        files.push(root + '/' + stat.name);
        next();
    });

    walker.on('end', function () {
        for (var i = files.length - 1; i >= 0; i--) {
            console.log("Found " + files[i]);
            storeFile(files[i], db);
        }
    });

});
