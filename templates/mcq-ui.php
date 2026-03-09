<?php
if (! defined('ABSPATH')) {
    exit;
}
?>
<div id="smpp-app" class="smpp-wrapper">
    <h2 class="smpp-title"><?php esc_html_e('Smart MCQ Practice Pro', 'smart-mcq-practice-pro'); ?></h2>

    <section class="smpp-panel">
        <h3><?php esc_html_e('Set Your Practice Criteria', 'smart-mcq-practice-pro'); ?></h3>
        <div class="smpp-grid">
            <label>
                <span><?php esc_html_e('Choose Your Medium', 'smart-mcq-practice-pro'); ?></span>
                <select id="smpp-medium"><option value=""><?php esc_html_e('Select Medium', 'smart-mcq-practice-pro'); ?></option></select>
            </label>
            <label>
                <span><?php esc_html_e('Choose Semester', 'smart-mcq-practice-pro'); ?></span>
                <select id="smpp-semester"><option value=""><?php esc_html_e('Select Semester', 'smart-mcq-practice-pro'); ?></option></select>
            </label>
            <label>
                <span><?php esc_html_e('Choose Subject', 'smart-mcq-practice-pro'); ?></span>
                <select id="smpp-subject"><option value=""><?php esc_html_e('Select Subject', 'smart-mcq-practice-pro'); ?></option></select>
            </label>
            <label>
                <span><?php esc_html_e('Pick a Chapter', 'smart-mcq-practice-pro'); ?></span>
                <select id="smpp-chapter"><option value=""><?php esc_html_e('Select Chapter', 'smart-mcq-practice-pro'); ?></option></select>
            </label>
            <label>
                <span><?php esc_html_e('Choose Topic', 'smart-mcq-practice-pro'); ?></span>
                <select id="smpp-topic"><option value=""><?php esc_html_e('Select Topic', 'smart-mcq-practice-pro'); ?></option></select>
            </label>
        </div>
        <button id="smpp-start" class="smpp-btn"><?php esc_html_e('Start Practice', 'smart-mcq-practice-pro'); ?></button>
    </section>

    <section class="smpp-panel" id="smpp-session" style="display:none;">
        <h3><?php esc_html_e('Your MCQ Session', 'smart-mcq-practice-pro'); ?></h3>
        <div class="smpp-meta">
            <p><strong><?php esc_html_e('Timer', 'smart-mcq-practice-pro'); ?>:</strong> <span id="smpp-timer">00:00</span></p>
            <p><strong><?php esc_html_e('Score', 'smart-mcq-practice-pro'); ?>:</strong> <span id="smpp-score">0</span>/<span id="smpp-total">0</span></p>
        </div>

        <div id="smpp-question-box"></div>

        <div class="smpp-actions">
            <button id="smpp-next" class="smpp-btn" style="display:none;"><?php esc_html_e('Next Question', 'smart-mcq-practice-pro'); ?></button>
        </div>
    </section>

    <section class="smpp-panel" id="smpp-explanation-panel" style="display:none;">
        <h3><?php esc_html_e('Question Explanation', 'smart-mcq-practice-pro'); ?></h3>
        <div id="smpp-explanation"></div>
        <p id="smpp-link-wrap" style="display:none;">
            <a id="smpp-link" href="#" target="_blank" rel="noopener noreferrer"><?php esc_html_e('Learn More', 'smart-mcq-practice-pro'); ?></a>
        </p>
    </section>

    <section class="smpp-panel">
        <h3><?php esc_html_e('Your Performance Report', 'smart-mcq-practice-pro'); ?></h3>
        <button id="smpp-performance" class="smpp-btn"><?php esc_html_e('View My Performance', 'smart-mcq-practice-pro'); ?></button>
        <div id="smpp-report" style="display:none;"></div>
    </section>
</div>
