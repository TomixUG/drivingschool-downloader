var sqlite = require('sqlite')
var sqlite3 = require('sqlite3')
var postgres = require('postgres')

var createPostgresTables = require('./createTables')

// INSERT INTO data.types (id) values ('a') on conflict (id) do nothing;

;(async () => {
  const sqlitedb = await sqlite.open({
    filename: 'data.db',
    driver: sqlite3.Database
  })

  const sql = postgres({
    host: 'localhost', // Postgres ip address[s] or domain name[s]
    port: 5432, // Postgres server port[s]
    database: 'drivingschool', // Name of database to connect to
    username: 'admin', // Username of database user
    password: 'pass', // Password of database user
    onnotice: () => false,
    idle_timeout: -1
  })

  await createPostgresTables(sql)
  await syncCategories(sql, sqlitedb, '')
  await syncCategories(sql, sqlitedb, '_en')
  await syncCategories(sql, sqlitedb, '_uk')

  await syncCatTypes(sql, sqlitedb)

  await syncQuestions(sql, sqlitedb, '')
  await syncQuestions(sql, sqlitedb, '_en')
  await syncQuestions(sql, sqlitedb, '_uk')

  await syncAnswers(sql, sqlitedb, '')
  await syncAnswers(sql, sqlitedb, '_en')
  await syncAnswers(sql, sqlitedb, '_uk')
})()

async function syncAnswers(sql, sqlitedb, lang) {
  var answers = await sqlitedb.all(`select * from answers${lang};`)

  for (const row of answers) {
    var id = row.id
    var text = row.text
    var is_correct = row.is_correct
    var question_id = row.question_id

    const exists = await sql.unsafe(`select id from data.answers${lang} where id = '${id}';`)
    if (exists.length > 0) {
      console.log('skipping...')
      continue
    }

    // insert it
    console.log(`answer (${id}) does not exist, creating...`)

    await sql.unsafe(
      `INSERT INTO data.answers${lang} VALUES ('${id}', $1, '${is_correct}', '${question_id}') on conflict (id) do nothing;`,
      [text]
    )
  }
}

async function syncQuestions(sql, sqlitedb, lang) {
  var questions = await sqlitedb.all(`select * from questions${lang};`)

  for (const row of questions) {
    var id = row.id
    var text = row.text
    var code = row.code
    var image_url = row.image_url
    var category_id = row.category_id
    var explanation = row.explanation

    const exists = await sql.unsafe(`select id from data.questions${lang} where id = '${id}';`)
    if (exists.length > 0) {
      console.log('skipping...')
      continue
    }

    // insert it
    console.log(`question (${id}) does not exist, creating...`)

    await sql.unsafe(
      `INSERT INTO data.questions${lang} VALUES ('${id}', $1, '${code}', ${varOrNull(
        image_url
      )}, '${category_id}', ${varOrNull(explanation)}) on conflict (id) do nothing;`,
      [text]
    )
  }
}

async function syncCategories(sql, sqlitedb, lang) {
  var categories = await sqlitedb.all(`select * from categories${lang};`)

  for (const row of categories) {
    var id = row.id
    var name = row.name
    var points = row.points
    var questions_to_exam = row.questions_to_exam

    const exists = await sql.unsafe(`select id from data.categories${lang} where id = '${id}';`)
    if (exists.length > 0) {
      console.log('skipping...')
      continue
    }

    // insert it
    console.log(`category (${id}) does not exist, creating...`)

    await sql.unsafe(
      `INSERT INTO data.categories${lang} VALUES (${id}, $1, ${points}, ${questions_to_exam}) on conflict (id) do nothing;`,
      [name]
    )
  }
}

async function syncCatTypes(sql, sqlitedb) {
  var catTypes = await sqlitedb.all('select * from category_types;')

  for (const row of catTypes) {
    var category_id = row.category_id
    var type_id = row.type_id

    const exists = await sql.unsafe(
      `select category_id from data.category_types where category_id = '${category_id}' AND type_id = '${type_id}';`
    )
    if (exists.length > 0) {
      console.log('skipping...')
      continue
    }

    // insert it
    console.log(`catType (${category_id}) does not exist, creating...`)

    await sql`INSERT INTO data.category_types VALUES (${category_id}, ${type_id});`
  }
}

function varOrNull(input) {
  return input == null ? 'null' : `'${input}'`
}
