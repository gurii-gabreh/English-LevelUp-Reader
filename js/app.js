(() => {
  'use strict';

  const STORAGE_KEY = 'elr-progress-v1';

  /** @type {{schemaVersion:number, dialect:string, levels:any[]}} */
  let lessonData = null;

  // ナビゲーション状態
  let currentLevel = null;
  let currentTopic = null;
  let currentLessonIndex = 0;

  const views = {
    levels: document.getElementById('view-levels'),
    topics: document.getElementById('view-topics'),
    lesson: document.getElementById('view-lesson'),
  };

  function showView(name) {
    Object.entries(views).forEach(([key, el]) => {
      el.hidden = key !== name;
    });
  }

  // --- 進捗(localStorageのみ。GitHubへは一切送信しない) ---
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { completedLessonIds: [] };
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.completedLessonIds)) parsed.completedLessonIds = [];
      return parsed;
    } catch (e) {
      console.warn('進捗データの読み込みに失敗しました。初期状態で開始します。', e);
      return { completedLessonIds: [] };
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn('進捗データの保存に失敗しました(ブラウザのストレージ制限の可能性があります)。', e);
    }
  }

  let progress = loadProgress();

  function isLessonDone(lessonId) {
    return progress.completedLessonIds.includes(lessonId);
  }

  function toggleLessonDone(lessonId) {
    const idx = progress.completedLessonIds.indexOf(lessonId);
    if (idx === -1) {
      progress.completedLessonIds.push(lessonId);
    } else {
      progress.completedLessonIds.splice(idx, 1);
    }
    saveProgress(progress);
  }

  // --- データ読み込み ---
  async function loadLessonData() {
    const res = await fetch('data/lessons.json');
    if (!res.ok) throw new Error(`data/lessons.json の取得に失敗しました (HTTP ${res.status})`);
    return res.json();
  }

  // --- レベル一覧描画 ---
  function renderLevelGrid() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    lessonData.levels.forEach((level) => {
      const totalLessons = (level.topics || []).reduce((sum, t) => sum + t.lessons.length, 0);
      const doneCount = (level.topics || []).reduce(
        (sum, t) => sum + t.lessons.filter((l) => isLessonDone(l.id)).length,
        0
      );
      const isReady = level.status === 'ready';

      const card = document.createElement('div');
      card.className = 'level-card' + (isReady ? '' : ' disabled');
      card.innerHTML = `
        <span class="level-badge">Lv.${level.id}</span>
        <h3>${escapeHtml(level.title)}</h3>
        <p>${escapeHtml(level.titleEn)}</p>
        ${isReady
          ? `<p>${doneCount} / ${totalLessons} 文完了</p>`
          : `<span class="status-tag">準備中</span>`}
      `;
      if (isReady) {
        card.addEventListener('click', () => openLevel(level));
      }
      grid.appendChild(card);
    });
  }

  function openLevel(level) {
    currentLevel = level;
    document.getElementById('topics-title').textContent = `Lv.${level.id} ${level.title}`;
    const list = document.getElementById('topic-list');
    list.innerHTML = '';
    level.topics.forEach((topic) => {
      const doneCount = topic.lessons.filter((l) => isLessonDone(l.id)).length;
      const item = document.createElement('div');
      item.className = 'topic-item';
      item.innerHTML = `
        <span>${escapeHtml(topic.name)}<br><small>${escapeHtml(topic.nameEn)}</small></span>
        <span class="count">${doneCount} / ${topic.lessons.length}</span>
      `;
      item.addEventListener('click', () => openTopic(topic));
      list.appendChild(item);
    });
    showView('topics');
  }

  function openTopic(topic) {
    currentTopic = topic;
    currentLessonIndex = 0;
    renderLesson();
    showView('lesson');
  }

  function renderLesson() {
    const lessons = currentTopic.lessons;
    const lesson = lessons[currentLessonIndex];

    document.getElementById('lesson-progress').textContent =
      `${currentTopic.name}(${currentLessonIndex + 1} / ${lessons.length})`;
    document.getElementById('lesson-en').textContent = lesson.en;
    document.getElementById('lesson-ja').textContent = lesson.ja;

    const vocabEl = document.getElementById('lesson-vocab');
    vocabEl.innerHTML = '';
    (lesson.vocab || []).forEach((v) => {
      const chip = document.createElement('span');
      chip.className = 'vocab-chip';
      chip.textContent = `${v.en} = ${v.ja}`;
      vocabEl.appendChild(chip);
    });

    const doneBtn = document.getElementById('btn-done');
    const done = isLessonDone(lesson.id);
    doneBtn.textContent = done ? '✓ 完了ずみ' : '✓ できた(記録する)';
    doneBtn.classList.toggle('is-done', done);

    document.getElementById('btn-prev').disabled = currentLessonIndex === 0;
    document.getElementById('btn-next').disabled = currentLessonIndex === lessons.length - 1;
  }

  // --- 読み上げ(ブラウザ標準SpeechSynthesis。無料・APIキー不要) ---
  function speakCurrentLesson() {
    if (!('speechSynthesis' in window)) {
      alert('お使いのブラウザは読み上げ機能(SpeechSynthesis API)に対応していません。');
      return;
    }
    const lesson = currentTopic.lessons[currentLessonIndex];
    const rate = parseFloat(document.getElementById('speak-rate').value);
    const utterance = new SpeechSynthesisUtterance(lesson.en);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    window.speechSynthesis.cancel(); // 前の発話が残っていたら止める
    window.speechSynthesis.speak(utterance);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  // --- イベント登録 ---
  function bindEvents() {
    document.querySelectorAll('[data-back]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.back;
        if (target === 'levels') {
          renderLevelGrid(); // 完了数が更新されている可能性があるので再描画
          showView('levels');
        } else if (target === 'topics') {
          openLevel(currentLevel);
        }
      });
    });

    document.getElementById('btn-speak').addEventListener('click', speakCurrentLesson);

    document.getElementById('btn-prev').addEventListener('click', () => {
      if (currentLessonIndex > 0) {
        currentLessonIndex -= 1;
        renderLesson();
      }
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      if (currentLessonIndex < currentTopic.lessons.length - 1) {
        currentLessonIndex += 1;
        renderLesson();
      }
    });

    document.getElementById('btn-done').addEventListener('click', () => {
      const lesson = currentTopic.lessons[currentLessonIndex];
      toggleLessonDone(lesson.id);
      renderLesson();
    });
  }

  // --- 起動 ---
  async function init() {
    try {
      lessonData = await loadLessonData();
      renderLevelGrid();
      bindEvents();
    } catch (e) {
      console.error(e);
      document.getElementById('level-grid').innerHTML =
        `<p style="color:#c0392b;">読み込みエラー: ${escapeHtml(e.message)}</p>`;
    }
  }

  init();
})();
