<?php
/**
 * TaxCoreAI – ML Inference Bridge
 * PHP wrapper around the Python inference_engine.py
 * Windows-compatible version
 */

require_once __DIR__ . '/../config/config.php';

class MLInference {

    // ── Auto-detect Python on Windows or Linux ────────────────────────────
    private static function getPythonPath(): string {
        // Check if custom path is defined in config
        if (defined('PYTHON_PATH') && file_exists(PYTHON_PATH)) {
            return PYTHON_PATH;
        }

        // Common Windows Python locations
        $windowsPaths = [
            'C:\\Python312\\python.exe',
            'C:\\Python311\\python.exe',
            'C:\\Python310\\python.exe',
            'C:\\Python39\\python.exe',
            'C:\\Program Files\\Python312\\python.exe',
            'C:\\Program Files\\Python311\\python.exe',
            'C:\\Program Files\\Python310\\python.exe',
            'C:\\Users\\' . (getenv('USERNAME') ?: 'user') . '\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
            'C:\\Users\\' . (getenv('USERNAME') ?: 'user') . '\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
            'C:\\Users\\' . (getenv('USERNAME') ?: 'user') . '\\AppData\\Local\\Programs\\Python\\Python310\\python.exe',
            'C:\\Users\\' . (getenv('USERNAME') ?: 'user') . '\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe',
        ];

        foreach ($windowsPaths as $path) {
            if (file_exists($path)) {
                return '"' . $path . '"';
            }
        }

        // Try PATH (Linux/Mac or Windows with PATH set)
        $which = shell_exec('where python 2>nul') ?: shell_exec('which python3 2>/dev/null');
        if ($which) {
            $path = trim(explode("\n", $which)[0]);
            if (file_exists($path)) {
                return '"' . $path . '"';
            }
        }

        // Final fallback
        return 'python';
    }

    private static function getEnginePath(): string {
        // Always use absolute Windows path
        return 'C:\\xampp\\htdocs\\taxcoreai\\python\\ml\\inference_engine.py';
    }

    /**
     * Core: call the Python inference engine.
     */
    private static function run(string $action, array $options = []): array {
        $python = self::getPythonPath();
        $engine = self::getEnginePath();

        $cmd = $python . ' "' . $engine . '" --action ' . escapeshellarg($action);

        if (!empty($options['text'])) {
            $cmd .= ' --text ' . escapeshellarg($options['text']);
        }
        if (!empty($options['data'])) {
            $cmd .= ' --data ' . escapeshellarg(
                is_array($options['data']) ? json_encode($options['data']) : $options['data']
            );
        }
        if (!empty($options['query'])) {
            $cmd .= ' --query ' . escapeshellarg($options['query']);
        }
        if (!empty($options['top_k'])) {
            $cmd .= ' --top_k ' . intval($options['top_k']);
        }
        if (!empty($options['category'])) {
            $cmd .= ' --category ' . escapeshellarg($options['category']);
        }

        // Windows: redirect stderr to nul, set CLAUDE_API_KEY
        if (defined('CLAUDE_API_KEY')) {
            $cmd = 'set "CLAUDE_API_KEY=' . CLAUDE_API_KEY . '" && ' . $cmd;
        }
        $cmd .= ' 2>nul';

        // Execute with timeout workaround for Windows
        $output = shell_exec($cmd);

        if ($output === null || trim($output) === '') {
            return ['error' => 'ML engine returned no output. Check Python path and models.'];
        }

        $result = json_decode($output, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ['error' => 'ML engine parse error: ' . substr(trim($output), 0, 300)];
        }

        return $result;
    }

    // ── Public API ────────────────────────────────────────────────────────

    public static function classifyDocument(string $text): array {
        return self::run('classify_doc', ['text' => $text]);
    }

    public static function scoreCompliance(array $features): array {
        return self::run('score_compliance', ['data' => $features]);
    }

    public static function detectAnomaly(array $record): array {
        return self::run('detect_anomaly', ['data' => $record]);
    }

    public static function batchAnomalyDetect(array $records): array {
        return self::run('batch_anomaly', ['data' => $records]);
    }

    public static function search(string $query, int $topK = 5, string $category = ''): array {
        $opts = ['query' => $query, 'top_k' => $topK];
        if ($category) $opts['category'] = $category;
        return self::run('search', $opts);
    }

    public static function extractEntities(string $text): array {
        return self::run('extract_entities', ['text' => $text]);
    }

    public static function predictRisk(array $features): array {
        return self::run('predict_risk', ['data' => $features]);
    }

    public static function fullAnalysis(array $features): array {
        return self::run('full_analysis', ['data' => $features]);
    }

    public static function modelStatus(): array {
        return self::run('model_status');
    }

    /**
     * Test if Python + models are reachable from PHP.
     * Returns: ['connected'=>true/false, 'python_path'=>'...', 'models_ready'=>11, 'error'=>'...']
     */
    public static function testConnection(): array {
        $python = self::getPythonPath();
        $engine = self::getEnginePath();

        // Check engine file exists
        if (!file_exists($engine)) {
            return [
                'connected'    => false,
                'python_path'  => $python,
                'models_ready' => 0,
                'error'        => 'inference_engine.py not found at: ' . $engine,
            ];
        }

        // Try running model_status
        $result = self::modelStatus();

        if (!empty($result['error'])) {
            return [
                'connected'    => false,
                'python_path'  => $python,
                'models_ready' => 0,
                'error'        => $result['error'],
            ];
        }

        return [
            'connected'    => true,
            'python_path'  => $python,
            'models_ready' => $result['ready_count'] ?? 0,
            'total_models' => $result['total_models'] ?? 11,
            'all_ready'    => $result['all_ready'] ?? false,
            'error'        => null,
        ];
    }

    /**
     * Build a taxpayer feature vector from DB record + stats.
     */
    public static function buildFeatureVector(array $taxpayer, array $stats = []): array {
        $lastFiling = $stats['last_filing_date'] ?? null;
        $daysSince  = $lastFiling
            ? (int) round((time() - strtotime($lastFiling)) / 86400)
            : 999;

        return [
            'has_email'              => !empty($taxpayer['email'])             ? 1 : 0,
            'has_phone'              => !empty($taxpayer['phone'])             ? 1 : 0,
            'has_address'            => !empty($taxpayer['address'])           ? 1 : 0,
            'has_category'           => !empty($taxpayer['tax_category'])      ? 1 : 0,
            'has_reg_date'           => !empty($taxpayer['registration_date']) ? 1 : 0,
            'doc_count'              => (int)($stats['doc_count']              ?? 0),
            'filing_count'           => (int)($stats['filing_count']           ?? 0),
            'days_since_last_filing' => $daysSince,
            'late_filings'           => (int)($stats['late_filings']           ?? 0),
            'penalties_count'        => (int)($stats['penalties_count']        ?? 0),
            'status_ok'              => $taxpayer['status'] === 'active'       ? 1 : 0,
            'is_flagged'             => $taxpayer['status'] === 'flagged'      ? 1 : 0,
            'years_registered'       => $taxpayer['registration_date']
                ? (int) round((time() - strtotime($taxpayer['registration_date'])) / (365.25 * 86400))
                : 0,
            'is_business'            => $taxpayer['type'] === 'business'       ? 1 : 0,
        ];
    }
}
