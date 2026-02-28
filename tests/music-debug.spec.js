// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Music player diagnostic', () => {
  test('check music player state after init', async ({ page }) => {
    // Collect console messages for debugging
    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

    await page.goto('/');
    await page.waitForSelector('.gallery-item', { timeout: 10000 });

    // Wait a bit for audioPlayer.init() to complete
    await page.waitForTimeout(1000);

    // Check shared audio player state
    const state = await page.evaluate(() => {
      const player = window.audioPlayer;
      return {
        audioPlayerExists: typeof player !== 'undefined',
        mediaExists: typeof window.media !== 'undefined',
        playlistLength: player ? player.playlist.length : -1,
        audioSrc: player ? player.audio.src : 'none',
        musicCardsCount: document.querySelectorAll('.gallery-item[data-category="music"]').length,
        playButtonsCount: document.querySelectorAll('.music-card-play').length,
        tracklistItems: document.querySelectorAll('#radio-tracklist .winamp-pl-item:not(.winamp-pl-empty)').length,
        emptyMsg: document.querySelector('#radio-tracklist .winamp-pl-empty') ? document.querySelector('#radio-tracklist .winamp-pl-empty').textContent.trim() : null,
        playPauseBtnExists: !!document.querySelector('.radio-playpause'),
        winampExists: !!document.querySelector('.winamp'),
      };
    });

    console.log('=== MUSIC PLAYER STATE ===');
    console.log(JSON.stringify(state, null, 2));

    // Print relevant console logs
    console.log('=== RELEVANT LOGS ===');
    const musicLogs = logs.filter(l =>
      l.toLowerCase().includes('music') ||
      l.toLowerCase().includes('audio') ||
      l.toLowerCase().includes('playlist') ||
      l.toLowerCase().includes('winamp') ||
      l.toLowerCase().includes('track') ||
      l.toLowerCase().includes('error') ||
      l.toLowerCase().includes('warn')
    );
    musicLogs.forEach(l => console.log(l));

    // Basic assertions
    expect(state.audioPlayerExists).toBe(true);
    expect(state.mediaExists).toBe(true);
    expect(state.winampExists).toBe(true);
    expect(state.playPauseBtnExists).toBe(true);

    // Check if playlist loaded
    console.log(`Playlist: ${state.playlistLength} tracks`);
    console.log(`Music cards in gallery: ${state.musicCardsCount}`);
    console.log(`Play buttons: ${state.playButtonsCount}`);
    console.log(`Tracklist items in sidebar: ${state.tracklistItems}`);
    if (state.emptyMsg) console.log(`Empty message: ${state.emptyMsg}`);

    // Now check if clicking a play button works
    if (state.playButtonsCount > 0) {
      // Filter to music first
      await page.click('.filter-btn[data-filter="music"]');
      await page.waitForTimeout(500);

      const playBtn = page.locator('.music-card-play').first();
      await playBtn.click();
      await page.waitForTimeout(500);

      const afterClick = await page.evaluate(() => {
        const player = window.audioPlayer;
        return {
          audioSrc: player.audio.src,
          audioPaused: player.audio.paused,
          currentTrackIndex: player.currentTrackIndex,
          currentTrackName: player.playlist[player.currentTrackIndex]?.name || 'none',
        };
      });
      console.log('=== AFTER PLAY CLICK ===');
      console.log(JSON.stringify(afterClick, null, 2));
    }

    // Also test sidebar play button
    const sidebarPlay = page.locator('.radio-playpause');
    await sidebarPlay.click();
    await page.waitForTimeout(500);

    const afterSidebarClick = await page.evaluate(() => {
      const player = window.audioPlayer;
      return {
        audioSrc: player.audio.src,
        audioPaused: player.audio.paused,
        currentTrackIndex: player.currentTrackIndex,
      };
    });
    console.log('=== AFTER SIDEBAR PLAY CLICK ===');
    console.log(JSON.stringify(afterSidebarClick, null, 2));
  });
});
