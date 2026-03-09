<?php

if (! defined('ABSPATH')) {
    exit;
}

class Smart_MCQ_Ajax_Handler {
    /** @var Smart_MCQ_CSV_Loader */
    private $csv_loader;

    public function __construct(Smart_MCQ_CSV_Loader $csv_loader)
    {
        $this->csv_loader = $csv_loader;

        add_action('wp_ajax_smpp_get_filters', array($this, 'get_filters'));
        add_action('wp_ajax_nopriv_smpp_get_filters', array($this, 'get_filters'));

        add_action('wp_ajax_smpp_get_questions', array($this, 'get_questions'));
        add_action('wp_ajax_nopriv_smpp_get_questions', array($this, 'get_questions'));
    }

    public function get_filters()
    {
        check_ajax_referer('smpp_nonce', 'nonce');

        $questions = $this->csv_loader->load_all_questions();

        $filters = array(
            'mediums'   => $this->unique_values($questions, 'medium'),
            'semesters' => $this->unique_values($questions, 'semester'),
            'subjects'  => $this->unique_values($questions, 'subject'),
            'chapters'  => $this->unique_values($questions, 'chapter'),
            'topics'    => $this->unique_values($questions, 'topic'),
        );

        wp_send_json_success($filters);
    }

    public function get_questions()
    {
        check_ajax_referer('smpp_nonce', 'nonce');

        $criteria = array(
            'medium'   => isset($_POST['medium']) ? sanitize_text_field(wp_unslash($_POST['medium'])) : '',
            'semester' => isset($_POST['semester']) ? sanitize_text_field(wp_unslash($_POST['semester'])) : '',
            'subject'  => isset($_POST['subject']) ? sanitize_text_field(wp_unslash($_POST['subject'])) : '',
            'chapter'  => isset($_POST['chapter']) ? sanitize_text_field(wp_unslash($_POST['chapter'])) : '',
            'topic'    => isset($_POST['topic']) ? sanitize_text_field(wp_unslash($_POST['topic'])) : '',
        );

        $questions = $this->csv_loader->load_all_questions();
        $filtered  = array_values(array_filter(
            $questions,
            static function ($question) use ($criteria) {
                foreach ($criteria as $key => $value) {
                    if ($value !== '' && isset($question[$key]) && $question[$key] !== $value) {
                        return false;
                    }
                }

                return true;
            }
        ));

        shuffle($filtered);
        wp_send_json_success(array('questions' => $filtered));
    }

    private function unique_values($questions, $field)
    {
        $values = array();

        foreach ($questions as $question) {
            if (! empty($question[$field])) {
                $values[] = $question[$field];
            }
        }

        $values = array_values(array_unique($values));
        sort($values);

        return $values;
    }
}
