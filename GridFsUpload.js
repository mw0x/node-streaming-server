
const mongodb = require('mongodb');

const multer = require('multer');

const { Readable } = require('stream');

/**
 *
 * Create GridFS upload request handler
 *
 * @param {Object} db               - MongoDB database object
 * @param {string} [bucketName=]    - Prefix for collection names
 * @param {string} [fieldName=file] - Form field name
 *
 * @returns {Function}
 *
 */

const GridFsUpload = (db, bucketName, fieldName = 'file') => {

  const bucket = new mongodb.GridFSBucket(db, { bucketName });

  const upload = multer({ storage: multer.memoryStorage() }).single(fieldName);

  return (req, res) => {

    upload(req, res, (err) => {

      if (!err) {

        if (req.file) {

          const { buffer, originalname, mimetype } = req.file;

          const fileStream = new Readable();
          fileStream.push(buffer);
          fileStream.push(null);

          const uploadStream = bucket.openUploadStream(originalname, { metadata: { mimetype } });
          fileStream.pipe(uploadStream);

          uploadStream.on('error', () => res.status(500).end());

          uploadStream.on('finish', () => res.status(201).json({ id: uploadStream.id }));

        }
        else {

          res.status(400).end();

        }

      }
      else {

        res.status(500).end();

      }

    })

  }

}

module.exports = GridFsUpload;
