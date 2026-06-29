        </main>
    </div>
</div>

<script>
// Flash message auto-dismiss
setTimeout(() => {
    document.querySelectorAll('.flash-message').forEach(el => {
        el.style.transition = 'opacity 0.5s';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
    });
}, 4000);

// Active sidebar item highlight
document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === window.location.pathname) {
        link.classList.add('active');
    }
});
</script>
</body>
</html>
