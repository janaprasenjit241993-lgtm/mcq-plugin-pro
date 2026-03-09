(function ($) {
    'use strict';

    const FILTER_FIELDS = ['medium', 'semester', 'subject', 'chapter', 'topic'];

    const state = {
        questionBank: [],
        indexes: null,
        questions: [],
        currentIndex: 0,
        score: 0,
        answered: 0,
        timer: 0,
        intervalId: null,
    };

    const dom = {
        medium: $('#smpp-medium'),
        semester: $('#smpp-semester'),
        subject: $('#smpp-subject'),
        chapter: $('#smpp-chapter'),
        topic: $('#smpp-topic'),
        start: $('#smpp-start'),
        session: $('#smpp-session'),
        timer: $('#smpp-timer'),
        score: $('#smpp-score'),
        total: $('#smpp-total'),
        questionBox: $('#smpp-question-box'),
        next: $('#smpp-next'),
        explanationPanel: $('#smpp-explanation-panel'),
        explanation: $('#smpp-explanation'),
        linkWrap: $('#smpp-link-wrap'),
        link: $('#smpp-link'),
        performance: $('#smpp-performance'),
        report: $('#smpp-report'),
    };

    function init() {
        initializeFilterState();
        bindEvents();
        loadQuestionBank();
    }

    function bindEvents() {
        dom.medium.on('change', onMediumChange);
        dom.semester.on('change', onSemesterChange);
        dom.subject.on('change', onSubjectChange);
        dom.chapter.on('change', onChapterChange);

        dom.start.on('click', startPractice);
        dom.next.on('click', showNextQuestion);
        dom.performance.on('click', renderReport);
    }

    function initializeFilterState() {
        resetSelect(dom.medium, 'Select Medium', false);
        resetSelect(dom.semester, 'Select Semester', true);
        resetSelect(dom.subject, 'Select Subject', true);
        resetSelect(dom.chapter, 'Select Chapter', true);
        resetSelect(dom.topic, 'Select Topic', true);
    }

    function loadQuestionBank() {
        $.post(smppConfig.ajaxUrl, {
            action: 'smpp_get_question_bank',
            nonce: smppConfig.nonce,
        }).done(function (response) {
            if (!response.success) {
                return;
            }

            state.questionBank = Array.isArray(response.data.questions) ? response.data.questions : [];
            state.indexes = buildIndexes(state.questionBank);
            populateSelect(dom.medium, state.indexes.mediums, 'Select Medium');
        }).fail(function () {
            alert(smppConfig.strings.loadError);
        });
    }

    function buildIndexes(rows) {
        const mediums = new Set();
        const semestersByMedium = new Map();
        const subjectsByMediumSemester = new Map();
        const chaptersByMediumSemesterSubject = new Map();
        const topicsByMediumSemesterSubjectChapter = new Map();

        rows.forEach(function (row) {
            const medium = safeValue(row.medium);
            const semester = safeValue(row.semester);
            const subject = safeValue(row.subject);
            const chapter = safeValue(row.chapter);
            const topic = safeValue(row.topic);

            if (!medium) {
                return;
            }

            mediums.add(medium);
            addSetValue(semestersByMedium, composeKey([medium]), semester);
            addSetValue(subjectsByMediumSemester, composeKey([medium, semester]), subject);
            addSetValue(chaptersByMediumSemesterSubject, composeKey([medium, semester, subject]), chapter);
            addSetValue(topicsByMediumSemesterSubjectChapter, composeKey([medium, semester, subject, chapter]), topic);
        });

        return {
            mediums: sortedSetValues(mediums),
            semestersByMedium,
            subjectsByMediumSemester,
            chaptersByMediumSemesterSubject,
            topicsByMediumSemesterSubjectChapter,
        };
    }

    function onMediumChange() {
        const medium = dom.medium.val();

        resetSelect(dom.semester, 'Select Semester', !medium);
        resetSelect(dom.subject, 'Select Subject', true);
        resetSelect(dom.chapter, 'Select Chapter', true);
        resetSelect(dom.topic, 'Select Topic', true);

        if (!medium || !state.indexes) {
            return;
        }

        const semesters = getIndexedOptions(state.indexes.semestersByMedium, [medium]);
        populateSelect(dom.semester, semesters, 'Select Semester');
        dom.semester.prop('disabled', false);
    }

    function onSemesterChange() {
        const medium = dom.medium.val();
        const semester = dom.semester.val();

        resetSelect(dom.subject, 'Select Subject', !semester);
        resetSelect(dom.chapter, 'Select Chapter', true);
        resetSelect(dom.topic, 'Select Topic', true);

        if (!medium || !semester || !state.indexes) {
            return;
        }

        const subjects = getIndexedOptions(state.indexes.subjectsByMediumSemester, [medium, semester]);
        populateSelect(dom.subject, subjects, 'Select Subject');
        dom.subject.prop('disabled', false);
    }

    function onSubjectChange() {
        const medium = dom.medium.val();
        const semester = dom.semester.val();
        const subject = dom.subject.val();

        resetSelect(dom.chapter, 'Select Chapter', !subject);
        resetSelect(dom.topic, 'Select Topic', true);

        if (!medium || !semester || !subject || !state.indexes) {
            return;
        }

        const chapters = getIndexedOptions(state.indexes.chaptersByMediumSemesterSubject, [medium, semester, subject]);
        populateSelect(dom.chapter, chapters, 'Select Chapter');
        dom.chapter.prop('disabled', false);
    }

    function onChapterChange() {
        const medium = dom.medium.val();
        const semester = dom.semester.val();
        const subject = dom.subject.val();
        const chapter = dom.chapter.val();

        resetSelect(dom.topic, 'Select Topic', !chapter);

        if (!medium || !semester || !subject || !chapter || !state.indexes) {
            return;
        }

        const topics = getIndexedOptions(state.indexes.topicsByMediumSemesterSubjectChapter, [medium, semester, subject, chapter]);
        populateSelect(dom.topic, topics, 'Select Topic');
        dom.topic.prop('disabled', false);
    }

    function resetSelect($select, placeholder, disabled) {
        $select.empty().append(`<option value="">${placeholder}</option>`);
        $select.prop('disabled', !!disabled);
    }

    function populateSelect($select, items, placeholder) {
        resetSelect($select, placeholder, false);
        items.forEach(function (item) {
            $select.append(`<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`);
        });
    }

    function getIndexedOptions(map, keyParts) {
        const values = map.get(composeKey(keyParts));
        return values ? sortedSetValues(values) : [];
    }

    function composeKey(parts) {
        return parts.map(safeValue).join('||');
    }

    function addSetValue(map, key, value) {
        if (!value) {
            return;
        }

        if (!map.has(key)) {
            map.set(key, new Set());
        }

        map.get(key).add(value);
    }

    function sortedSetValues(setValues) {
        return Array.from(setValues).sort(function (a, b) {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
    }

    function safeValue(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    function startPractice() {
        resetSession();

        const criteria = {};
        FILTER_FIELDS.forEach(function (field) {
            criteria[field] = dom[field].val();
        });

        const filtered = filterQuestions(state.questionBank, criteria);
        if (!filtered.length) {
            alert(smppConfig.strings.noQuestions);
            return;
        }

        state.questions = filtered;
        shuffleArray(state.questions);

        dom.total.text(state.questions.length);
        dom.session.show();
        startTimer();
        renderQuestion();
    }

    function filterQuestions(rows, criteria) {
        return rows.filter(function (question) {
            return FILTER_FIELDS.every(function (field) {
                const selected = safeValue(criteria[field]);
                if (!selected) {
                    return true;
                }

                return safeValue(question[field]) === selected;
            });
        });
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    function renderQuestion() {
        const q = state.questions[state.currentIndex];
        if (!q) {
            endSession();
            return;
        }

        dom.next.hide();
        dom.explanationPanel.hide();

        const html = `
            <div class="smpp-question">${q.question}</div>
            <div class="smpp-options">
                ${renderOption('option_a', `A. ${q.option_a}`)}
                ${renderOption('option_b', `B. ${q.option_b}`)}
                ${renderOption('option_c', `C. ${q.option_c}`)}
                ${renderOption('option_d', `D. ${q.option_d}`)}
            </div>
        `;

        dom.questionBox.html(html);
        dom.questionBox.find('.smpp-option').on('click', function () {
            evaluateAnswer($(this), q);
        });

        typesetMath();
    }

    function renderOption(key, label) {
        return `<button class="smpp-option" data-key="${key}">${label}</button>`;
    }

    function evaluateAnswer($option, question) {
        if ($option.hasClass('locked')) return;

        state.answered += 1;
        dom.questionBox.find('.smpp-option').addClass('locked');

        const selected = $option.data('key');
        const correct = question.correct;

        dom.questionBox.find(`.smpp-option[data-key="${correct}"]`).addClass('correct');

        if (selected === correct) {
            state.score += 1;
            $option.addClass('correct');
        } else {
            $option.addClass('wrong');
        }

        dom.score.text(state.score);
        dom.next.show();

        dom.explanation.html(question.explanation || 'No explanation provided.');

        if (question.link) {
            dom.link.attr('href', question.link);
            dom.linkWrap.show();
        } else {
            dom.linkWrap.hide();
        }

        dom.explanationPanel.show();
        typesetMath();
    }

    function showNextQuestion() {
        state.currentIndex += 1;
        renderQuestion();
    }

    function endSession() {
        stopTimer();
        dom.questionBox.html('<p class="smpp-finish">Practice complete! Click "View My Performance" for your report.</p>');
        dom.next.hide();
    }

    function startTimer() {
        stopTimer();
        state.intervalId = setInterval(function () {
            state.timer += 1;
            dom.timer.text(formatTime(state.timer));
        }, 1000);
    }

    function stopTimer() {
        if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }
    }

    function formatTime(seconds) {
        const min = String(Math.floor(seconds / 60)).padStart(2, '0');
        const sec = String(seconds % 60).padStart(2, '0');
        return `${min}:${sec}`;
    }

    function resetSession() {
        stopTimer();
        state.questions = [];
        state.currentIndex = 0;
        state.score = 0;
        state.answered = 0;
        state.timer = 0;
        dom.timer.text('00:00');
        dom.score.text('0');
        dom.total.text('0');
        dom.report.hide().empty();
        dom.questionBox.empty();
        dom.explanationPanel.hide();
        dom.linkWrap.hide();
    }

    function renderReport() {
        if (!state.answered) {
            dom.report.html(`<p>${smppConfig.strings.startFirst}</p>`).show();
            return;
        }

        const accuracy = ((state.score / state.answered) * 100).toFixed(2);
        const attempted = state.answered;
        const wrong = attempted - state.score;

        dom.report.html(`
            <ul class="smpp-report-list">
                <li><strong>Attempted:</strong> ${attempted}</li>
                <li><strong>Correct:</strong> ${state.score}</li>
                <li><strong>Wrong:</strong> ${wrong}</li>
                <li><strong>Accuracy:</strong> ${accuracy}%</li>
                <li><strong>Total Time:</strong> ${formatTime(state.timer)}</li>
            </ul>
        `).show();
    }

    function typesetMath() {
        if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            window.MathJax.typesetPromise();
        }
    }

    function escapeHtml(str) {
        return $('<div>').text(str).html();
    }

    $(init);
})(jQuery);
