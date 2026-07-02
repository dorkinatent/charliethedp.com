/* Work page interactions: video lightbox + expand/collapse archives */
(function () {
  var lightbox = document.getElementById('lightbox');
  var titleEl = document.getElementById('lightbox-title');
  var videoWell = document.getElementById('lightbox-video');

  function openVideo(id, title) {
    titleEl.textContent = 'NOW PLAYING — ' + (title || '').toUpperCase();
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1';
    iframe.title = 'Video player';
    iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
    iframe.setAttribute('allowfullscreen', '');
    /* YouTube requires a Referer header or it fails with Error 153 */
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    videoWell.appendChild(iframe);
    lightbox.hidden = false;
  }

  function closeVideo() {
    lightbox.hidden = true;
    videoWell.innerHTML = ''; /* destroy iframe to stop playback */
  }

  document.querySelectorAll('[data-video]').forEach(function (el) {
    /* tiles and the featured frame are non-interactive elements — make
       them keyboard-operable */
    if (!/^(a|button)$/i.test(el.tagName)) {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
    }
    function launchVideo() {
      openVideo(el.dataset.video, el.dataset.title);
    }
    el.addEventListener('click', launchVideo);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        launchVideo();
      }
    });
  });
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeVideo);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeVideo();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !lightbox.hidden) closeVideo();
  });

  document.querySelectorAll('.toggle-row .btn').forEach(function (btn) {
    var target = document.getElementById(btn.dataset.target);
    btn.addEventListener('click', function () {
      var show = target.hidden;
      target.hidden = !show;
      btn.textContent = show ? btn.dataset.less : btn.dataset.more;
    });
  });
})();
