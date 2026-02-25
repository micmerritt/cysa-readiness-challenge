import { ATTEMPT_SIZE, buildAttempt, getBlueprintSufficiencyIssues, renderQuestion } from './quiz.js';
import { buildSummary, formatMissedQuestionDetail, scoreAttempt } from './results.js';

const APP_VERSION = '0.1.0';

const refs = {
  views: {
    home: document.getElementById('home-view'),
    quiz: document.getElementById('quiz-view'),
    results: document.getElementById('results-view'),
  },
  homeStatus: document.getElementById('home-status'),
  startBtn: document.getElementById('start-btn'),
  progress: document.getElementById('quiz-progress'),
  question: document.getElementById('quiz-question'),
  form: document.getElementById('quiz-form'),
  nextBtn: document.getElementById('next-btn'),
  resultSeed: document.getElementById('result-seed'),
  tier: document.getElementById('tier'),
  overall: document.getElementById('overall'),
  categoryBreakdown: document.getElementById('category-breakdown'),
  missedQuestionsList: document.getElementById('missed-questions-list'),
  topMissedIds: document.getElementById('top-missed-ids'),
  remediationList: document.getElementById('remediation-list'),
  patternList: document.getElementById('pattern-list'),
  copySummaryBtn: document.getElementById('copy-summary-btn'),
  restartBtn: document.getElementById('restart-btn'),
};

const state = {
  seed: null,
  data: null,
  attempt: null,
  currentIndex: 0,
  results: null,
};

function showView(name) {
  Object.entries(refs.views).forEach(([key, element]) => {
    element.classList.toggle('hidden', key !== name);
  });
}

function getSeedFromUrl() {
  const value = new URLSearchParams(window.location.search).get('seed');
  return value ? value.trim() : null;
}

function generateSeed() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setHomeStatusMessage(messages) {
  refs.homeStatus.innerHTML = '';

  if (Array.isArray(messages)) {
    const list = document.createElement('ul');
    messages.forEach((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      list.append(item);
    });
    refs.homeStatus.append(list);
    return;
  }

  refs.homeStatus.textContent = messages;
}

async function loadData() {
  const [blueprint, questions, remediation] = await Promise.all([
    fetch('./data/blueprint.json').then((r) => r.json()),
    fetch('./data/question_bank.json').then((r) => r.json()),
    fetch('./data/remediation.json').then((r) => r.json()),
  ]);
  state.data = { blueprint, questions, remediation };

  if (!Array.isArray(questions) || questions.length === 0) {
    setHomeStatusMessage('No questions are available yet. Please check back soon.');
    refs.startBtn.disabled = true;
    return;
  }

  const sufficiencyIssues = getBlueprintSufficiencyIssues({ questions, blueprint });
  if (sufficiencyIssues.length) {
    setHomeStatusMessage([
      'Challenge cannot start because the blueprint cannot be satisfied:',
      ...sufficiencyIssues,
    ]);
    refs.startBtn.disabled = true;
    return;
  }

  setHomeStatusMessage(`Ready with blueprint-aligned ${ATTEMPT_SIZE}-question attempt.`);
  refs.startBtn.disabled = false;
}

function startAttempt() {
  state.seed = getSeedFromUrl() || generateSeed();
  state.currentIndex = 0;
  state.results = null;

  state.attempt = buildAttempt({
    questions: state.data.questions,
    blueprint: state.data.blueprint,
    seed: state.seed,
  });

  showView('quiz');
  renderQuestion(state, refs);
}

function storeCurrentAnswer() {
  const selected = refs.form.querySelector('input[name="answer"]:checked');
  if (!selected) return false;

  const question = state.attempt.questions[state.currentIndex];
  state.attempt.answers.set(question.id, Number(selected.value));
  return true;
}

function renderResults() {
  refs.resultSeed.textContent = `Seed: ${state.seed}`;
  refs.tier.textContent = `Tier: ${state.results.tier}`;
  refs.overall.textContent = `Score: ${state.results.correct}/${state.results.total} (${state.results.overallPercent}%)`;

  refs.categoryBreakdown.innerHTML = '';
  Object.keys(state.results.categoryTotals).forEach((category) => {
    const item = document.createElement('li');
    item.textContent = `${category}: ${state.results.categoryCorrect[category]}/${state.results.categoryTotals[category]} (${state.results.categoryPercents[category]}%)`;
    refs.categoryBreakdown.append(item);
  });

  refs.missedQuestionsList.innerHTML = '';
  const categoriesInOrder = Object.keys(state.results.categoryTotals);
  const allCorrect = state.results.correct === state.results.total;

  if (allCorrect) {
    const item = document.createElement('li');
    item.textContent = 'Missed questions: none';
    refs.missedQuestionsList.append(item);
  } else {
    categoriesInOrder.forEach((category) => {
      const item = document.createElement('li');
      const details = state.results.missedByCategory[category]?.length
        ? state.results.missedByCategory[category].map(formatMissedQuestionDetail).join(', ')
        : 'none';
      item.textContent = `${category}: ${details}`;
      refs.missedQuestionsList.append(item);
    });
  }

  const topMissedDetails = state.results.topMissedIds
    .map((id) => state.results.missedDetailsById[id])
    .filter(Boolean)
    .map(formatMissedQuestionDetail);

  refs.topMissedIds.textContent = topMissedDetails.length
    ? `Top missed IDs: ${topMissedDetails.join(', ')}`
    : 'Top missed IDs: none';

  refs.remediationList.innerHTML = '';
  state.results.topCategories.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = `${entry.data.title}: ${entry.data.bullets[0] || 'Review this domain.'}`;
    refs.remediationList.append(li);
  });

  refs.patternList.innerHTML = '';
  state.results.topPatterns.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = `${entry.data.title} (${entry.count}): ${entry.data.meaning}`;
    refs.patternList.append(li);
  });

  showView('results');
}

refs.startBtn.addEventListener('click', startAttempt);
refs.nextBtn.addEventListener('click', () => {
  if (!storeCurrentAnswer()) return;

  if (state.currentIndex + 1 < state.attempt.questions.length) {
    state.currentIndex += 1;
    renderQuestion(state, refs);
    return;
  }

  state.results = scoreAttempt({
    attempt: state.attempt,
    remediation: state.data.remediation,
  });
  renderResults();
});

refs.copySummaryBtn.addEventListener('click', async () => {
  const text = buildSummary({
    seed: state.seed,
    appVersion: APP_VERSION,
    results: state.results,
  });

  await navigator.clipboard.writeText(text);
  refs.copySummaryBtn.textContent = 'Copied!';
  window.setTimeout(() => {
    refs.copySummaryBtn.textContent = 'Copy Results Summary';
  }, 1200);
});

refs.restartBtn.addEventListener('click', () => {
  showView('home');
});

loadData().catch(() => {
  setHomeStatusMessage('Unable to load challenge data. Please refresh later.');
  refs.startBtn.disabled = true;
});
