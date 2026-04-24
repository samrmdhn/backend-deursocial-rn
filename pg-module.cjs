'use strict';
// CJS file so nft (Node File Tracer) can statically trace require('pg')
// and include the pg package in the Vercel deployment.
// Database.js references this via dialectModulePath.
module.exports = require('pg');
