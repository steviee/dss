Document Storage System
===

MongoDb backed document storage with meta-data and HTML5/CSS/Javascript viewer.
Feel free to watch it grow.

This is the plan:

import.js
===

Contains the logic to mass-import files from a directory. Each file will be saved as-is and as thumbnail and hi-res JPEG version (for the web viewer).
Files will be marked with special meta-data to find them fast within the database (categories, tags, ...).

Also indexes for faster search (ElasticSearch) and OCR (tesseract) could be possible.

Every file imported will get its own unique ID. Imported files can also be grouped by a "CombineId".
