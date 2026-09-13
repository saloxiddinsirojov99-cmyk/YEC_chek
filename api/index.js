// Vercel Serverless Function entrypoint for YEC Gilam API
// Delegates all incoming requests to Express application in server/api/index.js
const app = require('../server/api/index.js');

module.exports = app;
