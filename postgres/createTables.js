module.exports = async function createPostgresTables(sql) {
  console.log('creating schema')
  await sql`
      create schema if not exists data;
  `

  console.log('creating users tables')
  await sql`
      CREATE TABLE IF NOT EXISTS auth_user (
        id TEXT NOT NULL PRIMARY KEY,
        email TEXT NOT NULL,
        firstname TEXT,
        lastname TEXT,
        is_premium BOOLEAN NOT NULL DEFAULT 'f'
    );
  `
  await sql`
      CREATE TABLE IF NOT EXISTS user_key (
        id TEXT NOT NULL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES auth_user(id),
        hashed_password TEXT
    );
  `
  await sql`
      CREATE TABLE IF NOT EXISTS user_session (
        id TEXT NOT NULL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES auth_user(id),
        active_expires BIGINT NOT NULL,
        idle_expires BIGINT NOT NULL
    );
  `

  //  INSERT INTO user_answers (user_id, question_id, is_correct)
  // VALUES ('dj5rnoqfq1sfvow','0606038624', false)
  // ON CONFLICT (user_id, question_id) DO UPDATE SET
  // is_correct = false;

  // total success rate:
  //  select CAST(
  // (
  //   select count(*) from user_answers
  //   join data.questions as questions on (user_answers.question_id = questions.id)
  //   join data.category_types on (questions.category_id = data.category_types.category_id)
  //   where is_correct = 't' AND data.category_types.type_id = 'b' and user_answers.user_id = 'dj5rnoqfq1sfvow'
  // ) as REAL)
  // /
  // (
  //   select count(*) from user_answers
  //   join data.questions as questions on (user_answers.question_id = questions.id)
  //   join data.category_types on (questions.category_id = data.category_types.category_id)
  //   where is_correct is not null AND data.category_types.type_id = 'b' and user_answers.user_id = 'dj5rnoqfq1sfvow'
  // ) as amount;

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

  await sql`
  CREATE TABLE IF NOT EXISTS user_answers (
    user_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    is_correct BOOLEAN,
    flagged BOOLEAN NOT NULL default false,
    FOREIGN KEY (user_id) REFERENCES auth_user(id),
    FOREIGN KEY (question_id) REFERENCES data.questions(id),
    PRIMARY KEY (user_id, question_id)
);
`

  await sql`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT,
    value JSONB,
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES auth_user(id)
  );
  `

  // exams
  await sql`
  CREATE TABLE IF NOT EXISTS exams (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_user(id),
      date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duration integer NOT NULL,
      points integer NOT NULL,
      correct_questions integer NOT NULL,
      type text NOT NULL references data.types(id)   
  )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS exam_answers (
      exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES data.questions(id),
      answer_id TEXT REFERENCES data.answers(id)
  );
  `

  await sql`
        CREATE TABLE IF NOT EXISTS password_reset_token (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES auth_user(id),
        expires date
  );`

  await sql`
  CREATE TABLE IF NOT EXISTS payment (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES auth_user(id),
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status BOOLEAN NOT NULL DEFAULT 't'
  );`
}

async function createCategories(sql, name) {
  console.log(`creating categories`)
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS data.categories${name}  (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        points INTEGER NOT NULL,
        questions_to_exam INTEGER NOT NULL,
        category_order INTEGER NOT NULL
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
