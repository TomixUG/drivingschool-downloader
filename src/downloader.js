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
  db.run(`INSERT INTO categories VALUES ('${lecture.id}', '${lecture.name}');`);

  if (fs.existsSync(lectureDir)) {
    fsExtra.removeSync(lectureDir)
  }
  fsExtra.ensureDirSync(lectureDir)
  return fetchLecture(lecture.id).then((res) => {
    console.log(`Downloading ${lecture.name}, questions: ${res.Questions.length}`)
    const questionPromises = res.Questions.map((question, i) => {
      const id = question.QuestionID
      return () =>
        fetchQuestion(id).then((response) => {
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
            let filePath = assets.length === 0 ? null : `'${assets[0].filename}'`; // if there is no image write null

            let questionCode = question.Code === "" ? id : question.Code; // rarely the questionCode isn't there so we jsut use the normal id
            db.run(`INSERT INTO questions VALUES ('${questionCode}${lecture.id}', '${text}', ${filePath}, '${lecture.id}');`);

            answers.forEach(function(answer) {
              // check if the current answer is in the correctAnswers array
              let isCorrect = question.CorrectAnswers.includes(answer.id) ? 1 : 0;
              db.run(`INSERT INTO answers VALUES ('${answer.id}${lecture.id}', '${answer.text}', ${isCorrect}, '${questionCode}${lecture.id}');`);
            });

            return {
              id,
              text,
              code: question.Code,
              correctAnswers: question.CorrectAnswers,
              answers,
              assets
            };
          })
        })
    })

    return serialResolve(questionPromises).then((questions) => {
      console.log(`Saving ${lecture.name} `)
      questions.sort((a, b) => a.code.localeCompare(b.code))
      fs.writeFileSync(path.join(lectureDir, 'data.json'), JSON.stringify(questions, null, 2))
    })
  })
}

module.exports = {
  downloadLecture
}