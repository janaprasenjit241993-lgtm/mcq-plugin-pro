(function ($) {
    'use strict';

    const FILTER_FIELDS = ['medium', 'semester', 'subject', 'chapter', 'topic'];

    const state = {
        questionBank: [],
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
        dom.topic.on('change', onTopicChange);

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

            state.questionBank = parseQuestionBank(response.data);
            populateSelect(dom.medium, getUniqueValues(state.questionBank, function () {
                return true;
            }, 'medium'), 'Select Medium');
        }).fail(function () {
            alert(smppConfig.strings.loadError);
        });
    }

    function onMediumChange() {
        const medium = safeValue(dom.medium.val());

        resetSelect(dom.semester, 'Select Semester', !medium);
        resetSelect(dom.subject, 'Select Subject', true);
        resetSelect(dom.chapter, 'Select Chapter', true);
        resetSelect(dom.topic, 'Select Topic', true);

        if (!medium) {
            return;
        }

        const semesters = getUniqueValues(state.questionBank, function (row) {
            return safeValue(row.medium) === medium;
        }, 'semester');

        if (!semesters.length) {
            return;
        }

        populateSelect(dom.semester, semesters, 'Select Semester');
        dom.semester.prop('disabled', false);
    }

    function onSemesterChange() {
        const medium = safeValue(dom.medium.val());
        const semester = safeValue(dom.semester.val());

        resetSelect(dom.subject, 'Select Subject', !semester);
        resetSelect(dom.chapter, 'Select Chapter', true);
        resetSelect(dom.topic, 'Select Topic', true);

        if (!medium || !semester) {
            return;
        }

        const subjects = getUniqueValues(state.questionBank, function (row) {
            return safeValue(row.medium) === medium
                && safeValue(row.semester) === semester;
        }, 'subject');

        if (!subjects.length) {
            return;
        }

        populateSelect(dom.subject, subjects, 'Select Subject');
        dom.subject.prop('disabled', false);
    }

    function onSubjectChange() {
        const medium = safeValue(dom.medium.val());
        const semester = safeValue(dom.semester.val());
        const subject = safeValue(dom.subject.val());

        resetSelect(dom.chapter, 'Select Chapter', !subject);
        resetSelect(dom.topic, 'Select Topic', true);

        if (!medium || !semester || !subject) {
            return;
        }

        const chapters = getUniqueValues(state.questionBank, function (row) {
            return safeValue(row.medium) === medium
                && safeValue(row.semester) === semester
                && safeValue(row.subject) === subject;
        }, 'chapter');

        if (!chapters.length) {
            return;
        }

        populateSelect(dom.chapter, chapters, 'Select Chapter');
        dom.chapter.prop('disabled', false);
    }

    function onChapterChange() {
        const medium = safeValue(dom.medium.val());
        const semester = safeValue(dom.semester.val());
        const subject = safeValue(dom.subject.val());
        const chapter = safeValue(dom.chapter.val());

        resetSelect(dom.topic, 'Select Topic', !chapter);

        if (!medium || !semester || !subject || !chapter) {
            return;
        }

        const topics = getUniqueValues(state.questionBank, function (row) {
            return safeValue(row.medium) === medium
                && safeValue(row.semester) === semester
                && safeValue(row.subject) === subject
                && safeValue(row.chapter) === chapter;
        }, 'topic');

        if (!topics.length) {
            return;
        }

        populateSelect(dom.topic, topics, 'Select Topic');
        dom.topic.prop('disabled', false);
    }

    function onTopicChange() {
        // Topic is the last level in the cascade and has no child dropdown.
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

    function sortValues(values) {
        return values.sort(function (a, b) {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
    }

    function getUniqueValues(rows, predicate, field) {
        return sortValues([
            ...new Set(
                rows
                    .filter(predicate)
                    .map(function (row) {
                        return safeValue(row[field]);
                    })
                    .filter(Boolean)
            ),
        ]);
    }

    function parseQuestionBank(payload) {
        const candidateRows = payload && payload.questions;

        if (Array.isArray(candidateRows)) {
            return candidateRows.map(normalizeQuestionRow).filter(function (row) {
                return Object.keys(row).length > 0;
            });
        }

        if (payload && typeof payload.csv === 'string') {
            return parseCsvToObjects(payload.csv).map(normalizeQuestionRow);
        }

        return [];
    }

    function normalizeQuestionRow(row) {
        if (!row || typeof row !== 'object') {
            return {};
        }

        const normalized = {};
        Object.keys(row).forEach(function (key) {
            normalized[key] = typeof row[key] === 'string' ? row[key].trim() : row[key];
        });

        return normalized;
    }

    function parseCsvToObjects(csvText) {
        const lines = csvText.split(/\r?\n/).filter(Boolean);
        if (!lines.length) {
            return [];
        }

        const headers = parseCsvLine(lines[0]).map(function (header) {
            return header.trim();
        });

        return lines.slice(1).map(function (line) {
            const values = parseCsvLine(line);
            const row = {};

            headers.forEach(function (header, index) {
                row[header] = safeValue(values[index]);
            });

            return row;
        });
    }

    function parseCsvLine(line) {
        const cells = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"' && inQuotes && nextChar === '"') {
                current += '"';
                i += 1;
                continue;
            }

            if (char === '"') {
                inQuotes = !inQuotes;
                continue;
            }

            if (char === ',' && !inQuotes) {
                cells.push(current);
                current = '';
                continue;
            }

            current += char;
        }

        cells.push(current);
        return cells;
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
