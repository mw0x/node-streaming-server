
const mongodb = require('mongodb');

/**
 *
 * Parse range header
 *
 * @param {number} header - Range header
 * @param {number} length - Length of file
 *
 * @returns {Object} Object containing start and end
 *
 */

const parseRangeHeader = (header, length) => {

  if (!header) {

    return null;

  }

  const array = header.split(/bytes=([0-9]*)-([0-9]*)/);
  const start = parseInt(array[1]);
  const end = parseInt(array[2]);

  const result = {
    start: isNaN(start) ? 0 : start,
    end: isNaN(end) ? (length - 1) : end
  };

  if (!isNaN(start) && isNaN(end)) {
    result.start = start;
    result.end = length - 1;
  }

  if (isNaN(start) && !isNaN(end)) {
    result.start = length - end;
    result.end = length - 1;
  }

  return result;

}

/**
 *
 * Create GridFS download request handler
 *
 * @param {Object} db - MongoDB database object
 * @param {string} [bucketName=] - Prefix for collection names
 *
 * @returns {Function}
 *
 */

const GridFsDownload = (db, bucketName) => {

  const bucket = new mongodb.GridFSBucket(db, { bucketName });

  return async (req, res) => {

    try {

      // get file document for given id in order to retrieve length and metadata

      const fileId = new mongodb.ObjectID(req.params.id);
      const files = await bucket.find({ _id: fileId });
      const file = await files.next();

      if (file) {

        const { length, metadata } = file;

        // parse range header if any

        const range = parseRangeHeader(req.get('range'), length);

        // check whether range is available and satisfiable

        if (range && (range.start >= length || range.end >= length)) {

          // 416 Range Not Satisfiable

          res.set('Content-Range', `bytes */${length}`);

          res.status(416).end();

        }
        else {

          // deliver partial content or entire file

          let downloadStream;

          if (range) {

            // 206 Partial Content

            const { start, end } = range;

            downloadStream = bucket.openDownloadStream(fileId, { start, end })

            res.status(206).set({
              'Content-Type'    : metadata.mimetype,
              'Content-Range'   : `bytes ${start}-${end}/${length}`,
              'Content-Length'  : start == end ? 0 : (end - start + 1),
              'Accept-Ranges'   : 'bytes',
              'Cache-Control'   : 'no-cache',
            });

          }
          else {

            // 200 OK

            downloadStream = bucket.openDownloadStream(fileId)

            res.status(200).set({
              'Content-Type'    : metadata.mimetype,
              'Content-Length'  : length,
              'Accept-Ranges'   : 'bytes',
            });

          }

          downloadStream.on('data', (chunk) => res.write(chunk));

          downloadStream.on('end', () => res.end());

        }

      }
      else {

        res.status(404).end();

      }

    }
    catch(err) {

      res.status(500).end();

    }

  }

}

module.exports = GridFsDownload;
