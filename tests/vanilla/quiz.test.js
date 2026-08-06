// Tests -- initQuiz (#744, vague 12/N couverture tests vanilla)
//
// Expose via window.__initQuiz (shared/components.js:3563). Markup repris de
// pages/formulaires.html#quiz (classes/attrs reels) : .quiz[data-mode=quiz|
// poll] > .quiz-progress[role=progressbar] + .quiz-question[data-correct] >
// .quiz-fieldset > .quiz-option > input[type=radio] + .quiz-feedback, puis
// .quiz-result > .quiz-score + .quiz-restart.
//
// Le passage a la question suivante (handleQuizAnswer) passe par un
// setTimeout(1000) -- meme constat que inline-edit.test.js (saveDelay) et
// carousel.test.js (setInterval) : window.setTimeout de jsdom est distinct
// de l'horloge node, on le stube AVANT __initQuiz() pour capturer/declencher
// le callback a la main, deterministe.
import { describe, it, expect } from 'vitest';
import { loadComponentsWindow, fireClick } from './helpers/load-components.js';

function quizQuestionHtml(correct, name, options, active) {
  const opts = options
    .map((label, i) => `<label class="quiz-option"><input type="radio" name="${name}" value="${i}"><span>${label}</span></label>`)
    .join('');
  return `
    <div class="quiz-question${active ? ' active' : ''}" data-correct="${correct}">
      <fieldset class="quiz-fieldset">
        <legend class="quiz-question-title">${name}</legend>
        <div class="quiz-options">${opts}</div>
      </fieldset>
      <div class="quiz-feedback" role="status" aria-live="polite"></div>
    </div>
  `;
}

function quizHtml() {
  return `
    <div class="quiz" data-mode="quiz">
      <div class="quiz-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Progression">
        <div class="quiz-progress-bar" style="width:0%"></div>
      </div>
      ${quizQuestionHtml(1, 'q1', ['--primary', '--accent', '--text'], true)}
      ${quizQuestionHtml(2, 'q2', ['1', '2', '3'], false)}
      ${quizQuestionHtml(0, 'q3', ['tokens.css', 'styles.css', 'components.js'], false)}
      <div class="quiz-result" role="region" aria-label="Resultat du quiz">
        <div class="quiz-score" aria-live="polite"></div>
        <button class="quiz-restart btn-primary">Recommencer</button>
      </div>
    </div>
  `;
}

function pollHtml() {
  return `
    <div class="quiz" data-mode="poll">
      <div class="quiz-question active">
        <fieldset class="quiz-fieldset">
          <legend class="quiz-question-title">Framework prefere ?</legend>
          <div class="quiz-options">
            <label class="quiz-option"><input type="radio" name="poll1" value="0"><span>React</span></label>
            <label class="quiz-option"><input type="radio" name="poll1" value="1"><span>Vue</span></label>
          </div>
        </fieldset>
        <div class="quiz-poll-results" role="region" aria-label="Resultats du sondage" aria-live="polite"></div>
      </div>
    </div>
  `;
}

function setup(html) {
  const dom = loadComponentsWindow(html);
  const { window } = dom;
  const { document } = window;

  let capturedCb = null;
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = function (cb, delay) {
    capturedCb = cb;
    return 1;
  };

  window.__initQuiz();
  const quiz = document.querySelector('.quiz');
  return {
    window,
    document,
    quiz,
    advance: () => {
      const cb = capturedCb;
      capturedCb = null;
      cb();
    },
    restoreTimers: () => {
      window.setTimeout = originalSetTimeout;
    },
  };
}

function select(window, radio) {
  radio.checked = true;
  radio.dispatchEvent(new window.Event('change', { bubbles: true }));
}

describe('initQuiz -- mode quiz, etat initial', () => {
  it('la 1re question est active, la progress bar reflete 1/3', () => {
    const { quiz } = setup(quizHtml());
    const questions = quiz.querySelectorAll('.quiz-question');
    expect(questions[0].classList.contains('active')).toBe(true);
    expect(questions[1].classList.contains('active')).toBe(false);
    const progressWrap = quiz.querySelector('.quiz-progress');
    const progressBar = quiz.querySelector('.quiz-progress-bar');
    expect(progressWrap.getAttribute('aria-valuenow')).toBe('33');
    expect(progressBar.style.width).toBe('33%');
  });
});

describe('initQuiz -- mode quiz, reponse correcte', () => {
  it('selectionner la bonne reponse marque .correct+.selected, feedback "Bonne reponse !", desactive les options', () => {
    const { window, quiz } = setup(quizHtml());
    const q1 = quiz.querySelectorAll('.quiz-question')[0];
    const radios = q1.querySelectorAll('input[type="radio"]');
    const options = q1.querySelectorAll('.quiz-option');

    select(window, radios[1]); // value=1, data-correct=1

    expect(options[1].classList.contains('correct')).toBe(true);
    expect(options[1].classList.contains('selected')).toBe(true);
    expect(options[1].classList.contains('wrong')).toBe(false);
    radios.forEach(r => expect(r.disabled).toBe(true));

    const feedback = q1.querySelector('.quiz-feedback');
    expect(feedback.textContent).toBe('Bonne reponse !');
    expect(feedback.className).toBe('quiz-feedback show correct');
  });

  it('apres le delai, passe automatiquement a la question suivante et met a jour la progression (2/3)', () => {
    const { window, quiz, advance, restoreTimers } = setup(quizHtml());
    const q1 = quiz.querySelectorAll('.quiz-question')[0];
    const radios = q1.querySelectorAll('input[type="radio"]');
    select(window, radios[1]);

    // Avant resolution du timer : toujours sur la question 1.
    expect(q1.classList.contains('active')).toBe(true);

    advance();

    const questions = quiz.querySelectorAll('.quiz-question');
    expect(questions[0].classList.contains('active')).toBe(false);
    expect(questions[1].classList.contains('active')).toBe(true);
    const progressWrap = quiz.querySelector('.quiz-progress');
    expect(progressWrap.getAttribute('aria-valuenow')).toBe('67');
    restoreTimers();
  });
});

describe('initQuiz -- mode quiz, reponse incorrecte', () => {
  it('selectionner une mauvaise reponse marque .wrong+.selected sur le choix, .correct sur la bonne reponse, feedback "Mauvaise reponse."', () => {
    const { window, quiz } = setup(quizHtml());
    const q1 = quiz.querySelectorAll('.quiz-question')[0];
    const radios = q1.querySelectorAll('input[type="radio"]');
    const options = q1.querySelectorAll('.quiz-option');

    select(window, radios[0]); // value=0, data-correct=1 -> faux

    expect(options[0].classList.contains('wrong')).toBe(true);
    expect(options[0].classList.contains('selected')).toBe(true);
    expect(options[1].classList.contains('correct')).toBe(true); // la vraie bonne reponse reste indiquee
    const feedback = q1.querySelector('.quiz-feedback');
    expect(feedback.textContent).toBe('Mauvaise reponse.');
    expect(feedback.className).toBe('quiz-feedback show wrong');
  });
});

describe('initQuiz -- score final et reinitialisation', () => {
  it('3 bonnes reponses -> quiz-result affiche "3/3 — 100%"', () => {
    const { window, quiz, advance, restoreTimers } = setup(quizHtml());
    const questions = quiz.querySelectorAll('.quiz-question');
    const correctByQuestion = [1, 2, 0];

    correctByQuestion.forEach((correctVal, i) => {
      const radios = questions[i].querySelectorAll('input[type="radio"]');
      select(window, radios[correctVal]);
      advance();
    });

    const resultEl = quiz.querySelector('.quiz-result');
    const scoreEl = quiz.querySelector('.quiz-score');
    expect(resultEl.classList.contains('show')).toBe(true);
    expect(scoreEl.textContent).toBe('3/3 — 100%');
    questions.forEach(q => expect(q.classList.contains('active')).toBe(false));
    restoreTimers();
  });

  it('le bouton Recommencer reinitialise score, questions, options et masque le resultat', () => {
    const { window, quiz, advance, restoreTimers } = setup(quizHtml());
    const questions = quiz.querySelectorAll('.quiz-question');
    [1, 2, 0].forEach((correctVal, i) => {
      const radios = questions[i].querySelectorAll('input[type="radio"]');
      select(window, radios[correctVal]);
      advance();
    });

    const restartBtn = quiz.querySelector('.quiz-restart');
    fireClick(window, restartBtn);

    const resultEl = quiz.querySelector('.quiz-result');
    expect(resultEl.classList.contains('show')).toBe(false);
    expect(questions[0].classList.contains('active')).toBe(true);
    questions.forEach(q => {
      q.querySelectorAll('input[type="radio"]').forEach(r => {
        expect(r.checked).toBe(false);
        expect(r.disabled).toBe(false);
      });
      q.querySelectorAll('.quiz-option').forEach(o => {
        expect(o.classList.contains('correct')).toBe(false);
        expect(o.classList.contains('wrong')).toBe(false);
        expect(o.classList.contains('selected')).toBe(false);
      });
      const fb = q.querySelector('.quiz-feedback');
      expect(fb.textContent).toBe('');
      expect(fb.className).toBe('quiz-feedback');
    });
    const progressWrap = quiz.querySelector('.quiz-progress');
    expect(progressWrap.getAttribute('aria-valuenow')).toBe('33');
    restoreTimers();
  });
});

describe('initQuiz -- mode poll', () => {
  it('selectionner une option desactive les radios, marque .selected, et peuple .quiz-poll-results (1 barre/option)', () => {
    const { window, quiz } = setup(pollHtml());
    const question = quiz.querySelector('.quiz-question');
    const radios = question.querySelectorAll('input[type="radio"]');
    const options = question.querySelectorAll('.quiz-option');

    select(window, radios[0]);

    radios.forEach(r => expect(r.disabled).toBe(true));
    expect(options[0].classList.contains('selected')).toBe(true);
    expect(options[1].classList.contains('selected')).toBe(false);

    const pollResults = question.querySelector('.quiz-poll-results');
    expect(pollResults.classList.contains('show')).toBe(true);
    const bars = pollResults.querySelectorAll('.quiz-poll-bar');
    expect(bars.length).toBe(2);
    const labels = Array.from(pollResults.querySelectorAll('.quiz-poll-label')).map(l => l.textContent);
    expect(labels).toEqual(['React', 'Vue']);
    pollResults.querySelectorAll('.quiz-poll-pct').forEach(pctEl => {
      expect(pctEl.textContent).toMatch(/^\d+%$/);
    });
    pollResults.querySelectorAll('.quiz-poll-fill').forEach(fill => {
      // Largeur posee a 0% immediatement -- l'animation vers le %final
      // passe par un double requestAnimationFrame non asserte ici (effet
      // visuel progressif, pas une donnee sous garantie fonctionnelle).
      expect(fill.style.width).toBe('0%');
    });
  });
});

describe('initQuiz -- isolation multi-widget et idempotence', () => {
  it("reappeler initQuiz() est idempotent (pas de double avancement au meme changement)", () => {
    const { window, quiz, advance, restoreTimers } = setup(quizHtml());
    window.__initQuiz(); // 2e appel -- doit no-op (dataset.bound)
    const q1 = quiz.querySelectorAll('.quiz-question')[0];
    const radios = q1.querySelectorAll('input[type="radio"]');

    select(window, radios[1]);
    advance();

    // Si le listener 'change' etait double-attache, on aurait avance de 2
    // questions (currentIndex incremente 2x) au lieu d'1 -- ou le score
    // aurait ete compte 2x.
    const questions = quiz.querySelectorAll('.quiz-question');
    expect(questions[1].classList.contains('active')).toBe(true);
    expect(questions[2].classList.contains('active')).toBe(false);
    restoreTimers();
  });
});
