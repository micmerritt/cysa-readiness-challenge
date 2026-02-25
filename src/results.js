function getTier(overallPercent, categoryPercents) {
  const values = Object.values(categoryPercents);
  if (overallPercent >= 80 && values.every((value) => value >= 70)) return 'Ready';
  if (overallPercent < 70 || values.some((value) => value < 60)) return 'Not Ready';
  return 'Borderline';
}

export function scoreAttempt({ attempt, remediation }) {
  const categoryTotals = {};
  const categoryCorrect = {};
  const missedTags = {};
  let correct = 0;

  for (const question of attempt.questions) {
    categoryTotals[question.category] = (categoryTotals[question.category] || 0) + 1;
    categoryCorrect[question.category] = categoryCorrect[question.category] || 0;

    const selected = attempt.answers.get(question.id);
    if (selected === question.answerIndex) {
      correct += 1;
      categoryCorrect[question.category] += 1;
      continue;
    }

    for (const tag of question.tags || []) {
      missedTags[tag] = (missedTags[tag] || 0) + 1;
    }
  }

  const total = attempt.questions.length;
  const overallPercent = total ? Math.round((correct / total) * 100) : 0;
  const categoryPercents = Object.fromEntries(
    Object.entries(categoryTotals).map(([category, count]) => [
      category,
      Math.round(((categoryCorrect[category] || 0) / count) * 100),
    ]),
  );

  const topCategories = Object.entries(categoryPercents)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([category]) => ({ key: category, data: remediation.categories?.[category] }))
    .filter((item) => item.data);

  const topPatterns = Object.entries(missedTags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count, data: remediation.tags?.[tag] }))
    .filter((item) => item.data);

  return {
    tier: getTier(overallPercent, categoryPercents),
    correct,
    total,
    overallPercent,
    categoryTotals,
    categoryCorrect,
    categoryPercents,
    topCategories,
    topPatterns,
  };
}

export function buildSummary({ seed, appVersion, results }) {
  const categoryLines = Object.keys(results.categoryTotals).map((category) => {
    return `- ${category}: ${results.categoryCorrect[category]}/${results.categoryTotals[category]} (${results.categoryPercents[category]}%)`;
  });

  const remediationLines = results.topCategories.map(
    (item) => `- ${item.data.title}: ${item.data.bullets[0] || 'Review this category.'}`,
  );

  const patternLines = results.topPatterns.map(
    (item) => `- ${item.data.title} (${item.count}): ${item.data.meaning}`,
  );

  return [
    `Date/Time: ${new Date().toLocaleString()}`,
    `App Version: ${appVersion}`,
    `Seed: ${seed}`,
    `Tier: ${results.tier}`,
    `Overall: ${results.correct}/${results.total} (${results.overallPercent}%)`,
    'Category Scores:',
    ...categoryLines,
    'Top Remediation:',
    ...remediationLines,
    ...(patternLines.length ? ['Missed Patterns:', ...patternLines] : []),
  ].join('\n');
}
