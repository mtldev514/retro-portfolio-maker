document.addEventListener('DOMContentLoaded', async () => {
    await AppConfig.load();
    document.getElementById('mock-view-marker').textContent = 'MOCK VIEW LOADED';
});
