(function ($) {
    'use strict';

    const state = {
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
        loadFilters();
        bindEvents();
    }

    function bindEvents() {
        dom.start.on('click', startPractice);
        dom.next.on('click', showNextQuestion);
        dom.performance.on('click', renderReport);
    }

    function loadFilters() {
        $.post(smppConfig.ajaxUrl, {
            action: 'smpp_get_filters',
            nonce: smppConfig.nonce,
        }).done(function (response) {
            if (!response.success) return;
            populateSelect(dom.medium, response.data.mediums, 'Select Medium');
            populateSelect(dom.semester, response.data.semesters, 'Select Semester');
            populateSelect(dom.subject, response.data.subjects, 'Select Subject');
            populateSelect(dom.chapter, response.data.chapters, 'Select Chapter');
            populateSelect(dom.topic, response.data.topics, 'Select Topic');
        });
    }

    function populateSelect($select, items, placeholder) {
        $select.empty().append(`<option value="">${placeholder}</option>`);
        items.forEach(function (item) {
            $select.append(`<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`);
        });
    }

    function startPractice() {
        resetSession();

        const payload = {
            action: 'smpp_get_questions',
            nonce: smppConfig.nonce,
            medium: dom.medium.val(),
            semester: dom.semester.val(),
            subject: dom.subject.val(),
            chapter: dom.chapter.val(),
            topic: dom.topic.val(),
        };

        $.post(smppConfig.ajaxUrl, payload).done(function (response) {
            if (!response.success) {
                alert(smppConfig.strings.loadError);
                return;
            }

            state.questions = response.data.questions || [];
            if (!state.questions.length) {
                alert(smppConfig.strings.noQuestions);
                return;
            }

            dom.total.text(state.questions.length);
            dom.session.show();
            startTimer();
            renderQuestion();
        }).fail(function () {
            alert(smppConfig.strings.loadError);
        });
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
