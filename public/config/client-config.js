window.APP_CONFIG = {
    uniqueLink: null,
    playerId: null
  };
  
  document.addEventListener('DOMContentLoaded', () => {
    const uniqueLinkMeta = document.querySelector('meta[name="unique-link"]');
    const playerIdMeta = document.querySelector('meta[name="player-id"]');
  
    if (uniqueLinkMeta) {
      window.APP_CONFIG.uniqueLink = uniqueLinkMeta.content;
    }
  
    if (playerIdMeta) {
      window.APP_CONFIG.playerId = playerIdMeta.content;
    }
  
    console.log('App configuration loaded:', window.APP_CONFIG);
  });