module.exports = async function createPostgresTables(sql) {
  console.log('creating schema')
  await sql`
      create schema if not exists data;
      `

  console.log('creating types')
  await sql`
      CREATE TABLE IF NOT EXISTS data.types (
        id TEXT PRIMARY KEY
      );
   `
  await sql`INSERT INTO data.types (id) values ('a') on conflict (id) do nothing;`
  await sql`INSERT INTO data.types (id) values ('b') on conflict (id) do nothing;`
  await sql`INSERT INTO data.types (id) values ('c') on conflict (id) do nothing;`
  await sql`INSERT INTO data.types (id) values ('d') on conflict (id) do nothing;`

  await createCategories(sql, '')
  await createCategories(sql, '_en')
  await createCategories(sql, '_uk')

  await createQuestions(sql, '')
  await createQuestions(sql, '_en')
  await createQuestions(sql, '_uk')

  await createAnswers(sql, '')
  await createAnswers(sql, '_en')
  await createAnswers(sql, '_uk')

  console.log('creating category_types')
  await sql`
    CREATE TABLE IF NOT EXISTS data.category_types (
        category_id TEXT NOT NULL,
        type_id TEXT NOT NULL,
        PRIMARY KEY (category_id, type_id),
        FOREIGN KEY (category_id) REFERENCES data.categories (id),
        FOREIGN KEY (type_id) REFERENCES data.types (id)
    );
  `
}

async function createCategories(sql, name) {
  console.log(`creating categories`)
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS data.categories${name}  (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        points INTEGER NOT NULL,
        questions_to_exam INTEGER NOT NULL
    );
  `)
}

async function createQuestions(sql, name) {
  console.log(`creating questions`)
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS data.questions${name}  (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        code TEXT NOT NULL,
        image_url TEXT,
        category_id TEXT NOT NULL,
        explanation TEXT,
        FOREIGN KEY (category_id) REFERENCES data.categories${name} (id)
    );
  `)
}

async function createAnswers(sql, name) {
  console.log(`creating answers`)
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS data.answers${name} (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        question_id TEXT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES data.questions${name} (id)
    );
  `)
}
