
const express = require('express');

const mongodb = require('mongodb');

const GridFsUpload = require('./GridFsUpload');

const GridFsDownload = require('./GridFsDownload');

const main = async () => {

  try {

    const client = await mongodb.MongoClient.connect('mongodb://localhost');

    const db = client.db('node-streaming-server');

    const app = express();

    const router = express.Router();

    router.post('/', GridFsUpload(db));

    router.get('/file/:id', GridFsDownload(db));

    app.use(router);

    app.listen(3000);

  }
  catch(err) {

    console.error(err);

    process.exit(1);

  }

}

main();
