<?php
/**
 * Plugin Name: Smart MCQ Practice Pro
 * Plugin URI:  https://example.com/smart-mcq-practice-pro
 * Description: Advanced MCQ practice plugin with CSV-powered questions, MathJax support, filtering, timer, scoring, and performance reports.
 * Version:     1.0.0
 * Author:      Smart MCQ Team
 * License:     GPLv2 or later
 * Text Domain: smart-mcq-practice-pro
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! defined('SMPP_PLUGIN_FILE')) {
    define('SMPP_PLUGIN_FILE', __FILE__);
}
if (! defined('SMPP_PLUGIN_PATH')) {
    define('SMPP_PLUGIN_PATH', plugin_dir_path(__FILE__));
}
if (! defined('SMPP_PLUGIN_URL')) {
    define('SMPP_PLUGIN_URL', plugin_dir_url(__FILE__));
}
if (! defined('SMPP_DATA_DIR')) {
    define('SMPP_DATA_DIR', SMPP_PLUGIN_PATH . 'data/');
}

require_once SMPP_PLUGIN_PATH . 'includes/csv-loader.php';
require_once SMPP_PLUGIN_PATH . 'includes/ajax-handler.php';

class Smart_MCQ_Practice_Pro {
    /** @var Smart_MCQ_CSV_Loader */
    private $csv_loader;

    /** @var Smart_MCQ_Ajax_Handler */
    private $ajax_handler;

    public function __construct()
    {
        $this->csv_loader   = new Smart_MCQ_CSV_Loader();
        $this->ajax_handler = new Smart_MCQ_Ajax_Handler($this->csv_loader);

        register_activation_hook(SMPP_PLUGIN_FILE, array($this, 'on_activate'));

        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_shortcode('smart_mcq_practice_pro', array($this, 'render_shortcode'));

        add_action('admin_menu', array($this, 'register_admin_menu'));
        add_action('admin_post_smpp_upload_csv', array($this, 'handle_csv_upload'));
    }

    public function on_activate()
    {
        if (! file_exists(SMPP_DATA_DIR)) {
            wp_mkdir_p(SMPP_DATA_DIR);
        }

        $index_file = SMPP_DATA_DIR . 'index.php';
        if (! file_exists($index_file)) {
            file_put_contents($index_file, "<?php\n// Silence is golden.\n");
        }
    }

    public function enqueue_assets()
    {
        wp_register_style(
            'smpp-style',
            SMPP_PLUGIN_URL . 'assets/css/style.css',
            array(),
            '1.0.0'
        );

        wp_register_script(
            'smpp-script',
            SMPP_PLUGIN_URL . 'assets/js/script.js',
            array('jquery', 'smpp-mathjax'),
            '1.0.0',
            true
        );

        wp_register_script(
            'smpp-mathjax',
            'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
            array(),
            null,
            true
        );

        wp_add_inline_script(
            'smpp-mathjax',
            'window.MathJax = {tex: {inlineMath: [["$", "$"], ["\\(", "\\)"]], displayMath: [["$$","$$"], ["\\[","\\]"]]}, svg: {fontCache: "global"}};',
            'before'
        );

        wp_localize_script('smpp-script', 'smppConfig', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('smpp_nonce'),
            'strings' => array(
                'noQuestions' => __('No questions matched your selected filters.', 'smart-mcq-practice-pro'),
                'loadError'   => __('Could not load questions. Please try again.', 'smart-mcq-practice-pro'),
                'startFirst'  => __('Please start practice to view report.', 'smart-mcq-practice-pro'),
            ),
        ));
    }

    public function render_shortcode()
    {
        wp_enqueue_style('smpp-style');
        wp_enqueue_script('smpp-script');

        ob_start();
        include SMPP_PLUGIN_PATH . 'templates/mcq-ui.php';
        return ob_get_clean();
    }

    public function register_admin_menu()
    {
        add_menu_page(
            __('Smart MCQ Practice Pro', 'smart-mcq-practice-pro'),
            __('MCQ Practice Pro', 'smart-mcq-practice-pro'),
            'manage_options',
            'smpp-admin',
            array($this, 'render_admin_page'),
            'dashicons-welcome-learn-more',
            56
        );
    }

    public function render_admin_page()
    {
        if (! current_user_can('manage_options')) {
            return;
        }

        $uploaded_files = $this->csv_loader->get_uploaded_files();
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Smart MCQ Practice Pro - CSV Upload', 'smart-mcq-practice-pro'); ?></h1>
            <p><?php esc_html_e('Upload one or more CSV files. All files are merged as a single question bank for AJAX filtering.', 'smart-mcq-practice-pro'); ?></p>

            <?php if (isset($_GET['smpp_status'])) : ?>
                <div class="notice notice-success is-dismissible">
                    <p>
                        <?php
                        $status = sanitize_text_field(wp_unslash($_GET['smpp_status']));
                        if ($status === 'uploaded') {
                            esc_html_e('CSV uploaded successfully.', 'smart-mcq-practice-pro');
                        } elseif ($status === 'invalid') {
                            esc_html_e('Invalid CSV file. Please check required columns and try again.', 'smart-mcq-practice-pro');
                        }
                        ?>
                    </p>
                </div>
            <?php endif; ?>

            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" enctype="multipart/form-data">
                <?php wp_nonce_field('smpp_upload_csv_action', 'smpp_upload_csv_nonce'); ?>
                <input type="hidden" name="action" value="smpp_upload_csv" />

                <table class="form-table" role="presentation">
                    <tbody>
                    <tr>
                        <th scope="row"><label for="smpp_csv_file"><?php esc_html_e('CSV File', 'smart-mcq-practice-pro'); ?></label></th>
                        <td>
                            <input name="smpp_csv_file" type="file" id="smpp_csv_file" accept=".csv,text/csv" required />
                            <p class="description"><?php esc_html_e('Required columns: medium, semester, subject, chapter, topic, question, option_a, option_b, option_c, option_d, correct, explanation, link', 'smart-mcq-practice-pro'); ?></p>
                        </td>
                    </tr>
                    </tbody>
                </table>

                <?php submit_button(__('Upload CSV', 'smart-mcq-practice-pro')); ?>
            </form>

            <hr />
            <h2><?php esc_html_e('Uploaded Question Banks', 'smart-mcq-practice-pro'); ?></h2>
            <?php if (! empty($uploaded_files)) : ?>
                <ul>
                    <?php foreach ($uploaded_files as $file) : ?>
                        <li><?php echo esc_html($file); ?></li>
                    <?php endforeach; ?>
                </ul>
            <?php else : ?>
                <p><?php esc_html_e('No CSV files uploaded yet.', 'smart-mcq-practice-pro'); ?></p>
            <?php endif; ?>
        </div>
        <?php
    }

    public function handle_csv_upload()
    {
        if (! current_user_can('manage_options')) {
            wp_die(esc_html__('Unauthorized request.', 'smart-mcq-practice-pro'));
        }

        check_admin_referer('smpp_upload_csv_action', 'smpp_upload_csv_nonce');

        $status = 'invalid';

        if (isset($_FILES['smpp_csv_file'])) {
            $status = $this->csv_loader->save_uploaded_csv($_FILES['smpp_csv_file']) ? 'uploaded' : 'invalid';
        }

        wp_safe_redirect(
            add_query_arg(
                array('page' => 'smpp-admin', 'smpp_status' => $status),
                admin_url('admin.php')
            )
        );
        exit;
    }
}

new Smart_MCQ_Practice_Pro();
