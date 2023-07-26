const inquirer = require('inquirer')

const { lectures } = require('./lectures')
const { downloadLecture } = require('./downloader')
const { serialResolve } = require('./utils')

var sqlite3 = require('sqlite3')
var db = new sqlite3.Database('data.db')

// create tables
db.run(`
  CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
  );
`)

// id is a questionCode
db.run(`
  CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      image_url TEXT,
      category_id TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id)
  );
`)
db.run(`
  CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL,
      question_id TEXT NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions (id)
  );
`)

inquirer
  .prompt([
    {
      type: 'checkbox',
      message: 'Select lectures to download',
      name: 'lectures',
      choices: lectures.map((lecture) => ({
        name: lecture.name,
        value: lecture
      }))
    }
  ])
  .then((results) => {
    // console.log(results)
    const promiseFns = results.lectures.map((lecture) => () => downloadLecture(lecture, db))
    return serialResolve(promiseFns)
  })
  .catch((err) => {
    console.error(err)
  })
