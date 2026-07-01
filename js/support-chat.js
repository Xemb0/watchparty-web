/*
 * WatchParty — website live-support chat widget.
 *
 * Talks to the SAME dedicated support backend and the SAME tables
 * (watchparty_conversations / watchparty_messages) that the mobile app's
 * in-app support chat uses, so a message sent from watchparty.online lands in
 * the SAME Support Console agent inbox as one sent from the phone.
 *
 * A website visitor has no app account, so we sign them in ANONYMOUSLY (exactly
 * like the mobile module does) and attach the name/email they give us as plain
 * data on the conversation row, so the agent knows who is writing.
 *
 * Usage — load the Supabase SDK, then this file, then drop a mount point:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="/js/support-chat.js" defer></script>
 *   <div id="wp-support-chat"></div>
 */
(function () {
  "use strict";

  var SUPABASE_URL = "https://fmfohiluxefyfedptlvh.supabase.co";
  var SUPABASE_KEY = "sb_publishable_4Wq6WxhkaLel03iGhUgh7Q_r08OnOYL";
  var CONV_TABLE = "watchparty_conversations";
  var MSG_TABLE = "watchparty_messages";
  var LS_NAME = "wp_support_name";
  var LS_EMAIL = "wp_support_email";
  var SUPPORT_EMAIL = "imautotech.support@gmail.com";

  var mount = document.getElementById("wp-support-chat");
  if (!mount) return;

  function emailFallback(msg) {
    mount.innerHTML =
      '<div style="border:1px solid #374151;border-radius:16px;padding:20px;background:#111827;color:#e5e7eb;line-height:1.6">' +
      (msg || "Live chat is unavailable right now.") +
      ' Please email us at <a style="color:#f472b6" href="mailto:' + SUPPORT_EMAIL + '">' + SUPPORT_EMAIL +
      "</a> and we'll reply within 24–48 hours.</div>";
  }

  if (!window.supabase || !window.supabase.createClient) {
    emailFallback("Support chat couldn't load.");
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  var uid = null, conv = null, seen = {}, els = {};

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function esc(s) {
    return (s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- styles (self-contained; matches the site's dark theme) ----------
  var css = document.createElement("style");
  css.textContent = [
    "#wpsc{border:1px solid #374151;border-radius:16px;overflow:hidden;background:#0f172a;display:flex;flex-direction:column}",
    "#wpsc .h{background:linear-gradient(90deg,#6d28d9,#1e3a8a);padding:14px 18px;font-weight:600;color:#fff;display:flex;align-items:center;gap:9px}",
    "#wpsc .h .dot{width:9px;height:9px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399}",
    "#wpsc .body{height:430px;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}",
    "#wpsc .row{display:flex}#wpsc .row.me{justify-content:flex-end}",
    "#wpsc .bub{max-width:80%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}",
    "#wpsc .me .bub{background:#7c3aed;color:#fff;border-bottom-right-radius:4px}",
    "#wpsc .them .bub{background:#1f2937;color:#e5e7eb;border-bottom-left-radius:4px}",
    "#wpsc .foot{display:flex;gap:8px;padding:12px;border-top:1px solid #374151;background:#111827}",
    "#wpsc textarea,#wpsc input{flex:1;background:#1f2937;border:1px solid #374151;border-radius:12px;color:#fff;padding:11px 14px;font-size:14px;font-family:inherit;resize:none;outline:none}",
    "#wpsc input:focus,#wpsc textarea:focus{border-color:#7c3aed}",
    "#wpsc button.send{background:#7c3aed;border:none;color:#fff;border-radius:12px;padding:0 18px;font-weight:600;cursor:pointer}",
    "#wpsc button.send:disabled{opacity:.5;cursor:default}",
    "#wpsc .pre{padding:22px;display:flex;flex-direction:column;gap:10px;color:#e5e7eb}",
    "#wpsc .pre label{font-size:13px;color:#9ca3af;margin-top:4px}",
    "#wpsc .pre .start{background:#7c3aed;border:none;color:#fff;border-radius:12px;padding:12px;font-weight:600;cursor:pointer;margin-top:8px}",
    "#wpsc .muted{color:#6b7280;font-size:12px;text-align:center;padding:4px}",
  ].join("");
  document.head.appendChild(css);

  // ---------- pre-chat form (visitors aren't logged in) ----------
  function renderPre() {
    var n = localStorage.getItem(LS_NAME) || "", e = localStorage.getItem(LS_EMAIL) || "";
    mount.innerHTML =
      '<div id="wpsc"><div class="h"><span class="dot"></span>WatchParty Support</div>' +
      '<div class="pre">' +
      '<div style="font-size:14px;color:#cbd5e1;line-height:1.6">Chat with our support team — the same team that answers inside the app. Leave your details so we can follow up if you step away.</div>' +
      '<label>Your name</label><input id="wpsc-name" type="text" placeholder="Name" value="' + esc(n) + '"/>' +
      '<label>Email (optional, so we can reply if you leave)</label><input id="wpsc-email" type="email" placeholder="you@example.com" value="' + esc(e) + '"/>' +
      '<button class="start" id="wpsc-start">Start chat</button>' +
      "</div></div>";
    document.getElementById("wpsc-start").onclick = function () {
      var name = document.getElementById("wpsc-name").value.trim();
      var email = document.getElementById("wpsc-email").value.trim();
      if (name) localStorage.setItem(LS_NAME, name);
      if (email) localStorage.setItem(LS_EMAIL, email);
      start(name, email);
    };
  }

  function renderChat() {
    mount.innerHTML =
      '<div id="wpsc"><div class="h"><span class="dot"></span>WatchParty Support</div>' +
      '<div class="body" id="wpsc-body"></div>' +
      '<div class="foot"><textarea id="wpsc-input" rows="1" placeholder="Type your message…"></textarea>' +
      '<button class="send" id="wpsc-send">Send</button></div></div>';
    els.body = document.getElementById("wpsc-body");
    els.input = document.getElementById("wpsc-input");
    els.send = document.getElementById("wpsc-send");
    els.send.onclick = doSend;
    els.input.onkeydown = function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); doSend(); }
    };
  }

  function addMsg(m) {
    if (!m || !m.id || seen[m.id]) return;
    seen[m.id] = true;
    var mine = m.sender === "user";
    var row = document.createElement("div");
    row.className = "row " + (mine ? "me" : "them");
    row.innerHTML = '<div class="bub">' + esc(m.content) + "</div>";
    els.body.appendChild(row);
    els.body.scrollTop = els.body.scrollHeight;
  }

  function note(t) {
    var d = document.createElement("div");
    d.className = "muted"; d.textContent = t;
    els.body.appendChild(d); els.body.scrollTop = els.body.scrollHeight;
  }

  async function start(name, email) {
    renderChat();
    note("Connecting…");
    try {
      var sess = await client.auth.getSession();
      if (!sess.data.session) {
        var a = await client.auth.signInAnonymously();
        if (a.error) throw a.error;
      }
      var u = await client.auth.getUser();
      uid = u.data.user.id;

      var meta = { source: "website", page: location.pathname, user_agent: navigator.userAgent };
      var existing = await client.from(CONV_TABLE).select("*").eq("user_id", uid).maybeSingle();
      if (existing.data) {
        conv = existing.data;
        await client.from(CONV_TABLE).update({
          user_name: name || conv.user_name, user_email: email || conv.user_email, meta: meta,
        }).eq("user_id", uid);
      } else {
        var ins = await client.from(CONV_TABLE).insert({
          user_id: uid, user_name: name || null, user_email: email || null,
          title: "Website chat", meta: meta,
        }).select().single();
        if (ins.error) throw ins.error;
        conv = ins.data;
      }

      var hist = await client.from(MSG_TABLE).select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true });
      els.body.innerHTML = "";
      (hist.data || []).forEach(addMsg);
      if (!(hist.data || []).length) {
        var greet = document.createElement("div");
        greet.className = "row them";
        greet.innerHTML = '<div class="bub">Hi! 👋 How can we help you with WatchParty today?</div>';
        els.body.appendChild(greet);
      }

      // Agent replies: realtime + a polling fallback so nothing is missed.
      client
        .channel("wpsc-" + conv.id + "-" + uuid().slice(0, 8))
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: MSG_TABLE, filter: "conversation_id=eq." + conv.id },
          function (p) { addMsg(p.new); })
        .subscribe();
      setInterval(async function () {
        var r = await client.from(MSG_TABLE).select("*").eq("conversation_id", conv.id).order("created_at", { ascending: true });
        (r.data || []).forEach(addMsg);
      }, 6000);
    } catch (err) {
      emailFallback("We couldn't start the chat.");
    }
  }

  async function doSend() {
    var text = els.input.value.trim();
    if (!text || !conv) return;
    els.input.value = "";
    // Client-generated id so the optimistic bubble and the realtime/poll echo
    // dedupe to a single message (mirrors the mobile module's client id).
    var id = uuid();
    addMsg({ id: id, sender: "user", content: text });
    var r = await client.from(MSG_TABLE).insert({
      id: id, conversation_id: conv.id, sender: "user", sender_id: uid, content: text,
    });
    if (r.error) note("⚠️ Couldn't send that message — please try again.");
  }

  renderPre();
})();
