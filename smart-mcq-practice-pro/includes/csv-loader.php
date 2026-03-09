<?php

if (! defined('ABSPATH')) {
    exit;
}

class Smart_MCQ_CSV_Loader {
    /** @var string[] */
    private $required_columns = array(
        'medium',
        'semester',
        'subject',
        'chapter',
        'topic',
        'question',
        'option_a',
        'option_b',
        'option_c',
        'option_d',
        'correct',
        'explanation',
        'link',
    );

    public function get_uploaded_files()
    {
        if (! file_exists(SMPP_DATA_DIR)) {
            return array();
        }

        $files = glob(SMPP_DATA_DIR . '*.csv');
        if (! is_array($files)) {
            return array();
        }

        return array_map('basename', $files);
    }

    public function save_uploaded_csv($file)
    {
        if (empty($file['tmp_name']) || ! is_uploaded_file($file['tmp_name'])) {
            return false;
        }

        $filename = isset($file['name']) ? sanitize_file_name(wp_unslash($file['name'])) : '';
        if (pathinfo($filename, PATHINFO_EXTENSION) !== 'csv') {
            return false;
        }

        $handle = fopen($file['tmp_name'], 'r');
        if (! $handle) {
            return false;
        }

        $header = fgetcsv($handle);
        fclose($handle);

        if (! $this->is_valid_header($header)) {
            return false;
        }

        $destination = SMPP_DATA_DIR . time() . '-' . $filename;
        return move_uploaded_file($file['tmp_name'], $destination);
    }

    public function load_all_questions()
    {
        $questions = array();
        $files     = glob(SMPP_DATA_DIR . '*.csv');

        if (! is_array($files)) {
            return $questions;
        }

        foreach ($files as $csv_file) {
            $rows = $this->read_csv($csv_file);
            if (! empty($rows)) {
                $questions = array_merge($questions, $rows);
            }
        }

        return $questions;
    }

    private function read_csv($file_path)
    {
        $rows   = array();
        $handle = fopen($file_path, 'r');

        if (! $handle) {
            return $rows;
        }

        $header = fgetcsv($handle);
        if (! $this->is_valid_header($header)) {
            fclose($handle);
            return $rows;
        }

        $header = array_map('trim', $header);

        while (($data = fgetcsv($handle)) !== false) {
            if (count($data) !== count($header)) {
                continue;
            }

            $row = array();
            foreach ($header as $index => $column) {
                $value = isset($data[$index]) ? wp_kses_post(trim((string) $data[$index])) : '';
                if ($column === 'link') {
                    $value = esc_url_raw($value);
                }
                if ($column === 'correct') {
                    $value = sanitize_key($value);
                }
                if (in_array($column, array('medium', 'semester', 'subject', 'chapter', 'topic'), true)) {
                    $value = sanitize_text_field($value);
                }
                $row[$column] = $value;
            }

            if (! in_array($row['correct'], array('a', 'b', 'c', 'd', 'option_a', 'option_b', 'option_c', 'option_d'), true)) {
                continue;
            }

            $row['correct'] = $this->normalize_correct_key($row['correct']);
            $rows[]         = $row;
        }

        fclose($handle);
        return $rows;
    }

    private function is_valid_header($header)
    {
        if (! is_array($header)) {
            return false;
        }

        $normalized = array_map(
            static function ($column) {
                return strtolower(trim((string) $column));
            },
            $header
        );

        foreach ($this->required_columns as $required) {
            if (! in_array($required, $normalized, true)) {
                return false;
            }
        }

        return true;
    }

    private function normalize_correct_key($correct)
    {
        $map = array(
            'a'        => 'option_a',
            'b'        => 'option_b',
            'c'        => 'option_c',
            'd'        => 'option_d',
            'option_a' => 'option_a',
            'option_b' => 'option_b',
            'option_c' => 'option_c',
            'option_d' => 'option_d',
        );

        return isset($map[$correct]) ? $map[$correct] : '';
    }
}
