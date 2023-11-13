var sqlite = require('sqlite')
var sqlite3 = require('sqlite3')

var deepl = require('deepl-node')

const authKey = '9c9a9a11-a6ab-965c-5c36-99bab352a631:fx' // Replace with your key
// const authKey = '125fb1b8-760e-bf5e-e689-dba3546a9624:fx' // Replace with your key
const translator = new deepl.Translator(authKey)

;(async () => {
  // const result = await translator.translateText('Ahoj', 'cs', 'uk')
  // const translatedText = result.text
  await proccessQuestions('en')
  await proccessQuestions('uk')
  await proccessAnswers('en')
  await proccessAnswers('uk')
})()

async function proccessQuestions(language) {
  const db = await sqlite.open({
    filename: 'data.db',
    driver: sqlite3.Database
  })

  await db.run(`
    CREATE TABLE IF NOT EXISTS questions_${language} (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        code TEXT NOT NULL,
        image_url TEXT,
        category_id TEXT NOT NULL,
        explanation TEXT,
        FOREIGN KEY (category_id) REFERENCES categories (id)
    );
  `)

  var questions = await db.all('select * from questions;')

  for (const question of questions) {
    var id = question.id
    var text = question.text
    var code = question.code
    var image_url = question.image_url
    var category_id = question.category_id
    var explanation = question.explanation

    const questionOtherLang = await db.all(`select id from questions_${language} where id = '${id}';`)
    if (questionOtherLang.length > 0) {
      console.log('skipping...')
      continue
    }

    // insert it
    console.log(`[${language}] question (${id}) does not exist, creating...`)

    // translate text
    const result = await translator.translateText(text, 'cs', language == 'en' ? 'en-US' : language)
    const translatedText = result.text

    await db.run(
      `INSERT or ignore INTO questions_${language} VALUES ('${id}', ?, '${code}', '${image_url}', '${category_id}', '${explanation}');`,
      translatedText
    )
  }
  await db.close()
}

async function proccessAnswers(language) {
  const db = await sqlite.open({
    filename: 'data.db',
    driver: sqlite3.Database
  })

  await db.run(`
    CREATE TABLE IF NOT EXISTS answers_${language} (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        question_id TEXT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES questions (id)
    );
  `)

  var answers = await db.all('select * from answers;')

  for (const answer of answers) {
    var id = answer.id
    var text = answer.text
    var is_correct = answer.is_correct
    var question_id = answer.question_id

    const answerOtherLang = await db.all(`select id from answers_${language} where id = '${id}';`)
    if (answerOtherLang.length > 0) {
      console.log('skipping...')
      continue
    }

    // insert it
    console.log(`[${language}] answer (${id}) does not exist, creating...`)

    const result = await translator.translateText(text, 'cs', language == 'en' ? 'en-US' : language)
    const translatedText = result.text

    db.run(
      `INSERT or ignore INTO answers_${language} VALUES ('${id}', ?, ${is_correct}, '${question_id}');`,
      translatedText
    )
  }

  await db.close()
}
