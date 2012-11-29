#!/usr/bin/env node

var config = require('./config.json')
  , spawn  = require('child_process').spawn
  , fs     = require('fs')
  , temp   = require('temp')
  , async  = require('async')

temp.open('mysql-migrator', function(err, dump) {
  if (err) return console.log(err)

  var ws = fs.createWriteStream(dump.path)
  var p  = mysqldump(config.from, importFromDump)

  p.stdout.pipe(ws)

  function importFromDump(code, signal) {
    if (!code) importFrom(dump)
  }
})

function importFrom(dump) {
  async.forEachSeries(config.to, function(db, done) {
    importDump(fs.createReadStream(dump.path), db, done)
  })
}

function importDump(rs, db, done) {
  rs.pipe(mysql(db, done).stdin)
}

function mysql(db, done) {
  var p = spawn(config.mysql, [ '-u', db.user
                              , '-p'+ db.pass
                              , '-h', db.host
                              , db.name
                              ])

  p.on('exit', function(code, signal) {
    console.log('mysql for', db.name, 'on', db.host, 'exited with code', code)

    if (done) done(code, signal)
  })

  return p
}

function mysqldump(db, done) {
  var p = spawn(config.mysqldump, [ '-u', db.user
                                  , '-p'+ db.pass
                                  , '-h', db.host
                                  , db.name
                                  ])

  p.on('exit', function(code, signal) {
    console.log('mysqldump for', db.name, 'on', db.host, 'exited with code', code)

    if (done) done(code, signal)
  })

  return p
}
