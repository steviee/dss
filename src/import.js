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
    unoconv = require('unoconv'),
    magick = require('imagemagick'),
    path = require('path'),
    calls_running = 0;

// path setup

var basepath = path.join(__dirname, "../");

console.log("Base Path is " + basepath);

if (!fs.existsSync(basepath + "work")) {
    fs.mkdirSync("work", 0766, function (err) {
        if (err) {
            console.log(err);
        }
    });
}

if (!fs.existsSync(basepath + "imported")) {
    fs.mkdirSync("imported", 0766, function (err) {
        if (err) {
            console.log(err);
        }
    });
}

if (!fs.existsSync(basepath + "inbound")) {
    fs.mkdirSync("inbound", 0766, function (err) {
        if (err) {
            console.log(err);
        }
    });
}


var storeFile = function (fileName, db) {
    var grid = new Grid(db, 'files');

    var fileKey = sha1(fileName);
    console.log("  => Using key: " + fileKey);


    var mimeType = mime.lookup(fileName);
    var baseName = path.basename(fileName);
    var workName = path.join(basepath, "work/", baseName);

    fs.renameSync(fileName, workName, function (err) {
        if (err) throw err;
        console.log('  => Moved to \"work\".');

    });

    console.log("  => Step 1: Creating PDF");

    unoconv.convert(workName, 'pdf', function (err, result) {
        // result is returned as a Buffer
        fs.writeFile(path.join(basepath, "work/temp.pdf"), result);

        console.log("  => Step 2: Creating JPEGs");

        magick.convert([path.join(basepath, "work/temp.pdf"), '-density', '400', path.join(basepath, "work/page-%d.jpg")], function (err, stdout) {
            if (err) throw err;
            console.log('ImageMagick:', stdout);

            var file = fs.readFileSync(workName);

            calls_running += 1;
            grid.put(file, { filename: baseName, content_type: mimeType }, function () {
                calls_running -= 1;
                console.log("  => Done.");

                fs.renameSync(workName, path.join(basepath, "imported/", baseName), function (err) {
                    if (err) throw err;
                    console.log('  => Moved to \"imported\".');
                });

            });
        });
    });
};

fs.watch(basepath + 'inbound', function (event, fileName) {
    if (fileName) {
        if (event !== 'rename') {
            console.log('New file found: ' + fileName);
            storeFile(fileName);
        }
    }
});

Db.connect('mongodb://localhost:27017/dss', function (err, db) {

    console.log("Connected to MongoDb!");

    // Walker options
    var walker = walk.walk(basepath + 'inbound', { followLinks: false });

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
