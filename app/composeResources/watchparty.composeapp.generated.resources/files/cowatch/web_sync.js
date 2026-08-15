/*
 * WatchParty CoWatch — in-WebView playback sync content script.
 *
 * Injected into a streaming site (Netflix / Prime / …) that the user has
 * logged into with THEIR OWN account, inside our own WebView. It does NOT
 * touch DRM or the video bytes — the site's own player (Widevine on Android
 * WebView / FairPlay on WKWebView) decodes as normal. We only:
 *   - observe the <video> element's play / pause / seek / time, and report
 *     them to native  (HOST side → broadcast to the room), and
 *   - apply remote play / pause / seek commands onto the <video>
 *     (PARTICIPANT side), WITHOUT the applied change echoing back as a
 *     user event (the feedback-loop guard below).
 *
 * Native bridges (either may exist depending on platform):
 *   Android : window.WPCoWatch.onEvent(jsonString)      (JavascriptInterface)
 *   iOS     : window.webkit.messageHandlers.wpcowatch.postMessage(obj)
 * Native → web entry point: window.__wpCoWatchApply(action, positionSec)
 *
 * Idempotent: re-injecting replaces the previous instance cleanly (Netflix
 * swaps <video> elements between titles, and WebViews re-inject on nav).
 */
(function () {
  'use strict';

  // Tear down a previous injection so re-inject doesn't double-hook events.
  if (window.__wpCoWatch && window.__wpCoWatch.teardown) {
    try { window.__wpCoWatch.teardown(); } catch (e) {}
  }

  // While we are APPLYING a remote command, the resulting play/pause/seek
  // events must NOT be reported back (or two clients would ping-pong forever).
  // We hold a short suppression window keyed on wall-clock.
  var applyingUntil = 0;
  var SUPPRESS_MS = 900;
  function suppressing() { return Date.now() < applyingUntil; }

  // Throttle timeupdate: the host only needs a heartbeat ~1/s, not 4/s.
  var lastTimeReport = 0;
  var TIME_REPORT_MS = 1000;

  var video = null;

  function post(payload) {
    payload.ts = Date.now();
    try {
      if (window.WPCoWatch && window.WPCoWatch.onEvent) {
        window.WPCoWatch.onEvent(JSON.stringify(payload));
        return;
      }
    } catch (e) {}
    try {
      if (window.webkit && window.webkit.messageHandlers &&
          window.webkit.messageHandlers.wpcowatch) {
        window.webkit.messageHandlers.wpcowatch.postMessage(payload);
      }
    } catch (e) {}
  }

  function report(action) {
    if (!video || suppressing()) return;
    post({
      type: 'event',
      action: action,                       // 'play' | 'pause' | 'seek' | 'time' | 'ended'
      position: Math.max(0, video.currentTime || 0),
      duration: isFinite(video.duration) ? video.duration : 0,
      playing: !video.paused,
    });
  }

  var handlers = {
    play:   function () { report('play'); },
    pause:  function () { report('pause'); },
    seeked: function () { report('seek'); },
    ended:  function () { report('ended'); },
    timeupdate: function () {
      var now = Date.now();
      if (now - lastTimeReport < TIME_REPORT_MS) return;
      lastTimeReport = now;
      report('time');
    },
  };

  function hook(v) {
    if (!v || v === video) return;
    unhook();
    video = v;
    for (var k in handlers) v.addEventListener(k, handlers[k]);
    post({ type: 'ready', position: v.currentTime || 0, playing: !v.paused });
  }

  function unhook() {
    if (!video) return;
    for (var k in handlers) {
      try { video.removeEventListener(k, handlers[k]); } catch (e) {}
    }
    video = null;
  }

  // The active <video> is the largest one currently on the page. Netflix /
  // Prime render exactly one player <video>; picking the biggest is robust to
  // stray thumbnail/preview videos.
  function findVideo() {
    var best = null, bestArea = 0;
    var vids = document.querySelectorAll('video');
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      var r = v.getBoundingClientRect();
      var area = r.width * r.height;
      if (area > bestArea) { bestArea = area; best = v; }
    }
    return best;
  }

  // Poll for the player: SPA navigations swap the element with no reliable
  // DOM event. Cheap (250ms) and self-correcting when the title changes.
  var poll = setInterval(function () {
    // Skip the querySelectorAll + getBoundingClientRect sweep (a forced
    // layout on a heavy OTT DOM) while the hooked video is still live —
    // the scan only needs to run again after an SPA title swap detaches it.
    if (video && video.isConnected) return;
    var v = findVideo();
    if (v && v !== video) hook(v);
  }, 1000);

  // Native → web: apply a remote command without it echoing back.
  window.__wpCoWatchApply = function (action, positionSec) {
    if (!video) video = findVideo();
    if (!video) return false;
    applyingUntil = Date.now() + SUPPRESS_MS;
    try {
      if (action === 'seek' && typeof positionSec === 'number') {
        // Only seek when meaningfully off — seeking re-buffers DRM streams,
        // so a needless seek CAUSES the stutter it's meant to fix.
        if (Math.abs((video.currentTime || 0) - positionSec) > 1.2) {
          video.currentTime = positionSec;
        }
      } else if (action === 'play') {
        if (typeof positionSec === 'number' &&
            Math.abs((video.currentTime || 0) - positionSec) > 1.2) {
          video.currentTime = positionSec;
        }
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      } else if (action === 'pause') {
        video.pause();
      }
    } catch (e) {}
    return true;
  };

  window.__wpCoWatch = {
    teardown: function () { clearInterval(poll); unhook(); },
  };

  // Report the initial state if a player is already up.
  var v0 = findVideo();
  if (v0) hook(v0);
})();
