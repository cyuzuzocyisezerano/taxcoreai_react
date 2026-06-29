<?php
// Fetch unread notifications count
$unreadCount = 0;
if (isset($_SESSION['user_id'])) {
    $db = Database::getInstance();
    $result = $db->fetchOne(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id=? AND is_read=0",
        [$_SESSION['user_id']]
    );
    $unreadCount = $result['count'] ?? 0;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle ?? 'TaxCoreAI') ?> – Rwanda Revenue Authority</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'rra-blue':  '#003087',
                        'rra-blue-dark': '#00205f',
                        'rra-blue-light': '#1a4aad',
                        'rra-gold':  '#FFC20E',
                        'rra-gold-dark': '#e0aa00',
                        'rra-gray':  '#f4f6fb',
                        'rra-text':  '#1a2340',
                    },
                    fontFamily: {
                        sans: ['Inter', 'system-ui', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .sidebar-link { transition: all 0.2s ease; }
        .sidebar-link:hover, .sidebar-link.active {
            background: rgba(255, 194, 14, 0.15);
            border-left: 3px solid #FFC20E;
            color: #FFC20E;
        }
        .sidebar-link .icon { width: 20px; text-align: center; }
        .badge { animation: pulse 2s infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
        .card-hover { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .card-hover:hover { box-shadow: 0 8px 30px rgba(0,48,135,0.12); transform: translateY(-2px); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #003087; border-radius: 3px; }
    </style>
</head>
<body class="bg-rra-gray text-rra-text">

<!-- Sidebar -->
<div class="flex h-screen overflow-hidden">
    <aside id="sidebar" class="w-64 bg-rra-blue flex flex-col flex-shrink-0 overflow-y-auto transition-all duration-300">
        <!-- Logo -->
        <div class="flex items-center gap-3 px-5 py-5 border-b border-rra-blue-light">
            <div class="w-10 h-10 bg-rra-gold rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fas fa-landmark text-rra-blue text-lg"></i>
            </div>
            <div>
                <div class="text-white font-bold text-base leading-tight">TaxCoreAI</div>
                <div class="text-blue-300 text-xs">Rwanda Revenue Authority</div>
            </div>
        </div>

        <!-- User Info -->
        <div class="px-5 py-4 border-b border-rra-blue-light">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-rra-gold flex items-center justify-center text-rra-blue font-bold text-sm">
                    <?= strtoupper(substr($_SESSION['full_name'] ?? 'U', 0, 1)) ?>
                </div>
                <div>
                    <div class="text-white text-sm font-medium truncate max-w-[130px]"><?= htmlspecialchars($_SESSION['full_name'] ?? 'Officer') ?></div>
                    <div class="text-blue-300 text-xs capitalize"><?= htmlspecialchars($_SESSION['role'] ?? 'officer') ?></div>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-4 space-y-1">
            <?php
            $currentPage = basename($_SERVER['PHP_SELF'], '.php');
            $navItems = [
                ['href'=>'/taxcoreai/dashboard.php','icon'=>'fa-gauge-high','label'=>'Dashboard','page'=>'dashboard'],
                ['href'=>'/taxcoreai/taxpayers/index.php','icon'=>'fa-users','label'=>'Taxpayers','page'=>'index','section'=>'taxpayers'],
                ['href'=>'/taxcoreai/documents/index.php','icon'=>'fa-folder-open','label'=>'Documents','page'=>'index','section'=>'documents'],
                ['href'=>'/taxcoreai/search.php','icon'=>'fa-magnifying-glass','label'=>'Search & Retrieval','page'=>'search'],
                ['href'=>'/taxcoreai/workflows.php','icon'=>'fa-diagram-project','label'=>'Workflows','page'=>'workflows'],
                ['href'=>'/taxcoreai/notifications.php','icon'=>'fa-bell','label'=>'Notifications','page'=>'notifications', 'badge'=>true],
                ['href'=>'/taxcoreai/reports.php','icon'=>'fa-chart-bar','label'=>'Reports & Analytics','page'=>'reports'],
                ['href'=>'/taxcoreai/ai-assistant.php','icon'=>'fa-robot','label'=>'AI Assistant','page'=>'ai-assistant','highlight'=>true],
                ['href'=>'/taxcoreai/audit.php','icon'=>'fa-shield-halved','label'=>'Audit Logs','page'=>'audit'],
            ];
            if (($_SESSION['role'] ?? '') === 'admin') {
                $navItems[] = ['href'=>'/taxcoreai/admin/users.php','icon'=>'fa-users-gear','label'=>'User Management','page'=>'users'];
                $navItems[] = ['href'=>'/taxcoreai/admin/settings.php','icon'=>'fa-gear','label'=>'Settings','page'=>'settings'];
            }
            foreach ($navItems as $item):
                $active = $currentPage === $item['page'] ? 'active' : '';
            ?>
            <a href="<?= $item['href'] ?>" 
               class="sidebar-link <?= $active ?> flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-200 text-sm font-medium <?= isset($item['highlight']) ? 'border border-rra-gold/30' : '' ?>">
                <span class="icon"><i class="fas <?= $item['icon'] ?> text-sm"></i></span>
                <span class="flex-1"><?= $item['label'] ?></span>
                <?php if (isset($item['badge'])): ?>
                <span class="bg-rra-gold text-rra-blue text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"><?= $unreadCount ?></span>
                <?php endif; ?>
                <?php if (isset($item['highlight'])): ?>
                <span class="text-xs bg-rra-gold/20 text-rra-gold px-1.5 py-0.5 rounded text-[10px] font-semibold">AI</span>
                <?php endif; ?>
            </a>
            <?php endforeach; ?>
        </nav>

        <!-- Logout -->
        <div class="px-3 py-4 border-t border-rra-blue-light">
            <a href="/taxcoreai/auth/logout.php" class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-300 text-sm hover:text-red-400">
                <span class="icon"><i class="fas fa-right-from-bracket text-sm"></i></span>
                <span>Logout</span>
            </a>
        </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <!-- Top Bar -->
        <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div class="flex items-center gap-4">
                <button onclick="document.getElementById('sidebar').classList.toggle('w-0')" 
                        class="text-gray-500 hover:text-rra-blue">
                    <i class="fas fa-bars text-lg"></i>
                </button>
                <h1 class="font-semibold text-rra-text text-lg"><?= htmlspecialchars($pageTitle ?? 'Dashboard') ?></h1>
            </div>
            <div class="flex items-center gap-4">
                <!-- Quick Search -->
                <form action="/search.php" method="GET" class="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                    <i class="fas fa-search text-gray-400 text-sm"></i>
                    <input type="text" name="q" placeholder="Search taxpayer, TIN…" 
                           class="bg-transparent outline-none text-sm w-48 text-gray-700" />
                </form>
                <!-- Notification Bell -->
                <a href="/taxcoreai/notifications.php" class="relative text-gray-500 hover:text-rra-blue">
                    <i class="fas fa-bell text-lg"></i>
                    <?php if ($unreadCount > 0): ?>
                    <span class="absolute -top-1 -right-1 w-4 h-4 bg-rra-gold text-rra-blue text-[9px] font-bold rounded-full flex items-center justify-center"><?= min($unreadCount, 9) ?></span>
                    <?php endif; ?>
                </a>
                <!-- RRA Logo badge -->
                <div class="hidden md:flex items-center gap-2 text-xs text-gray-500">
                    <span class="bg-rra-blue text-white px-2 py-1 rounded text-xs font-semibold">RRA</span>
                    <span>Rwanda Revenue Authority</span>
                </div>
            </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 overflow-y-auto p-6 fade-in">
