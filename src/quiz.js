function normalizeBlueprint(raw, questions) {
  if (!raw || Array.isArray(raw)) {
    const fallback = {};
    for (const q of questions) {
      fallback[q.category] = (fallback[q.category] || 0) + 1;
    }
    return fallback;
  }
  return raw;
}

function createSeededRng(seedText) {
  let value = 2166136261;
  for (const char of seedText) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, random) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function buildAttempt({ questions, blueprint, seed }) {
  const rng = createSeededRng(seed);
  const selected = [];
  const normalizedBlueprint = normalizeBlueprint(blueprint, questions);

  for (const [category, count] of Object.entries(normalizedBlueprint)) {
    const pool = shuffle(
      questions.filter((q) => q.category === category),
      rng,
    );
    selected.push(...pool.slice(0, Number(count) || 0));
  }

  const ordered = shuffle(selected, rng).map((question) => {
    const choicePairs = question.choices.map((choice, index) => ({ choice, index }));
    const shuffledChoices = shuffle(choicePairs, rng);

    return {
      ...question,
      originalAnswerIndex: question.answerIndex,
      choices: shuffledChoices.map((item) => item.choice),
      answerIndex: shuffledChoices.findIndex((item) => item.index === question.answerIndex),
    };
  });

  return {
    questions: ordered,
    answers: new Map(),
  };
}

export function renderQuestion(state, refs) {
  const question = state.attempt.questions[state.currentIndex];
  refs.progress.textContent = `Question ${state.currentIndex + 1} of ${state.attempt.questions.length}`;
  refs.question.textContent = question.prompt;

  refs.form.innerHTML = '';
  question.choices.forEach((choiceText, index) => {
    const id = `choice-${state.currentIndex}-${index}`;
    const wrapper = document.createElement('label');
    wrapper.className = 'choice';
    wrapper.htmlFor = id;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'answer';
    input.id = id;
    input.value = String(index);
    input.checked = state.attempt.answers.get(question.id) === index;

    wrapper.append(input, choiceText);
    refs.form.append(wrapper);
  });
}
