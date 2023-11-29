const fs = require('fs')
const path = require('path')
const fsExtra = require('fs-extra')

const { fetchLecture, fetchQuestion, fetchAsset } = require('./api')
const { parseQuestionHtml, serialResolve } = require('./utils')

const DATA_DIR = path.join(__dirname, '../data')

function downloadAsset(lectureDir, videoUrl, name) {
  return fetchAsset(videoUrl).then((res) => {
    const contentType = res.headers['content-type']
    const ext = contentType.replace(/(video|image)\/\.?/, '')
    const filename = `${name}.${ext}`
    fs.writeFileSync(path.join(lectureDir, filename), Buffer.from(res.data, 'binary'))
    return { filename, contentType }
  })
}

function downloadLecture(lecture, db) {
  const lectureDir = path.join(DATA_DIR, `${lecture.id}`)

  // add category entry
  db.run(
    `INSERT or ignore INTO categories VALUES ('${lecture.id}', '${lecture.name}', '${lecture.points}', '${lecture.questionsToExam}', '${lecture.categoryOrder}');`
  )

  // add category_types entry
  lecture.type.forEach((t) => {
    db.run(`INSERT or ignore INTO category_types (category_id, type_id) VALUES ('${lecture.id}', '${t}');`)
  })

  if (!fs.existsSync(lectureDir)) {
    fsExtra.ensureDirSync(lectureDir)
  }
  return fetchLecture(lecture.id).then((res) => {
    console.log(`Downloading ${lecture.name}, questions: ${res.Questions.length}`)
    const questionPromises = res.Questions.map((question, i) => {
      const id = question.QuestionID

      let questionId = `${question.Code === '' ? id : question.Code}${lecture.id}` // rarely the questionCode isn't there so we jsut use the normal id

      return () =>
        fetchQuestion(id).then((response) => {
          // FIXME: this way is stupid, first check, then fetch
          db.all(`select id from questions where id='${questionId}'`, (err, rows) => {
            // was question found?
            if (rows.length > 0) {
              console.log(`[${i + 1}/${res.Questions.length}] question exists, skipping..`)
              return
            }

            console.log(`[${i + 1}/${res.Questions.length}] Downloading Question ${i + 1}`)
            const { text, answers, imageUrls, videoUrl } = parseQuestionHtml(response)

            const assetPromiseFactories = imageUrls.map(
              (imageUrl, index) => () => downloadAsset(lectureDir, imageUrl, `${id}-${index + 1}`)
            )

            if (videoUrl) {
              assetPromiseFactories.push(() => downloadAsset(lectureDir, videoUrl, `${id}-${imageUrls + 1}`))
            }

            return serialResolve(assetPromiseFactories).then((assets) => {
              // save the question and answer
              // adding the lecture.id to make it unique, there can be the same qeuestion in different category
              let filePath = assets.length === 0 ? null : `'${assets[0].filename}'` // if there is no image write null

              // FIXME: in case this fails in the future
              db.run(
                `INSERT or ignore INTO questions VALUES ('${questionId}', '${text}', '${question.Code}', ${filePath}, '${lecture.id}, NULL');`
              )

              answers.forEach(function (answer) {
                // check if the current answer is in the correctAnswers array
                let isCorrect = question.CorrectAnswers.includes(answer.id) ? 1 : 0
                db.run(
                  `INSERT or ignore INTO answers VALUES ('${answer.id}${lecture.id}', '${answer.text}', ${isCorrect}, '${questionId}');`
                )
              })

              return {
                id,
                text,
                code: question.Code,
                correctAnswers: question.CorrectAnswers,
                answers,
                assets
              }
            })
          })
        })
    })

    return serialResolve(questionPromises).then((questions) => {
      console.log(`Saving ${lecture.name} `)
      questions.sort((a, b) => a.code.localeCompare(b.code))
      // fs.writeFileSync(path.join(lectureDir, 'data.json'), JSON.stringify(questions, null, 2))
    })
  })
}

module.exports = {
  downloadLecture
}
