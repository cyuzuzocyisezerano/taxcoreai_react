<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

function startSecureSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'httponly' => true,
            'samesite' => 'Strict',
        ]);
        session_start();
    }
}

function requireLogin(): void {
    startSecureSession();
    if (empty($_SESSION['user_id'])) {
        header('Location: /taxcoreai/auth/login.php?redirect=' . urlencode($_SERVER['REQUEST_URI']));
        exit;
    }
}

function requireRole(array $roles): void {
    requireLogin();
    if (!in_array($_SESSION['role'] ?? '', $roles)) {
        http_response_code(403);
        die('<div style="text-align:center;padding:60px;"><h1>403 – Access Denied</h1><p>You do not have permission to access this page.</p></div>');
    }
}

function login(string $username, string $password): array {
    $db = Database::getInstance();
    $user = $db->fetchOne("SELECT * FROM users WHERE username = ?", [$username]);
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        return ['success' => false, 'message' => 'Invalid username or password.'];
    }

    startSecureSession();
    session_regenerate_id(true);
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['username']  = $user['username'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['email']     = $user['email'];
    $_SESSION['role']      = $user['role'];

    $db->query("UPDATE users SET last_login = NOW() WHERE id = ?", [$user['id']]);
    logAudit('login', 'user', $user['id']);
    
    return ['success' => true, 'user' => $user];
}

function logout(): void {
    startSecureSession();
    logAudit('logout', 'user', $_SESSION['user_id'] ?? null);
    session_destroy();
    header('Location: /taxcoreai/auth/login.php');
    exit;
}

function logAudit(string $action, string $resourceType = '', ?int $resourceId = null, string $oldVal = '', string $newVal = ''): void {
    try {
        $db = Database::getInstance();
        $db->insert('audit_logs', [
            'user_id'       => $_SESSION['user_id'] ?? null,
            'action'        => $action,
            'resource_type' => $resourceType,
            'resource_id'   => $resourceId,
            'old_value'     => $oldVal,
            'new_value'     => $newVal,
            'ip_address'    => $_SERVER['REMOTE_ADDR'] ?? '',
            'user_agent'    => $_SERVER['HTTP_USER_AGENT'] ?? '',
        ]);
    } catch (Exception $e) {
        // Silently fail – audit log should never break the app
    }
}

function csrfToken(): string {
    startSecureSession();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrf(): void {
    $token = $_POST['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(403);
        die('Invalid CSRF token.');
    }
}

function flashMessage(string $type, string $message): void {
    startSecureSession();
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function getFlash(): ?array {
    startSecureSession();
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $flash;
}

function renderFlash(): void {
    $flash = getFlash();
    if (!$flash) return;
    $colors = [
        'success' => 'bg-green-50 text-green-800 border-green-300',
        'error'   => 'bg-red-50 text-red-800 border-red-300',
        'warning' => 'bg-yellow-50 text-yellow-800 border-yellow-300',
        'info'    => 'bg-blue-50 text-blue-800 border-blue-300',
    ];
    $icons = ['success'=>'fa-check-circle','error'=>'fa-circle-xmark','warning'=>'fa-triangle-exclamation','info'=>'fa-circle-info'];
    $cls = $colors[$flash['type']] ?? $colors['info'];
    $icon = $icons[$flash['type']] ?? $icons['info'];
    echo "<div class='flash-message border rounded-lg px-4 py-3 mb-4 flex items-center gap-3 {$cls}'>";
    echo "<i class='fas {$icon}'></i>";
    echo "<span>" . htmlspecialchars($flash['message']) . "</span>";
    echo "</div>";
}
