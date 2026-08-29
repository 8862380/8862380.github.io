'use strict';

(function () {
  const cfg = window.AUTH_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY ||
      cfg.SUPABASE_URL.indexOf('xxxx') > -1) {
    console.warn('[auth] 尚未配置 Supabase，请在 js/supabase-config.js 中填写。');
  }

  const supabase = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY
  );

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('zh-CN', { hour12: false });
  }

  window.AUTH = {
    supabase,

    async getSession() {
      const { data, error } = await supabase.auth.getSession();
      return error ? null : data.session;
    },

    async getUser() {
      const { data, error } = await supabase.auth.getUser();
      return error ? null : data.user;
    },

    async signUp(email, password, displayName) {
      return supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { display_name: (displayName || '').trim() },
          // 确认邮件里的链接跳转到登录页
          emailRedirectTo: (cfg.SITE_URL || '') + '/login.html'
        }
      });
    },

    async signIn(email, password) {
      return supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
    },

    async signOut() {
      return supabase.auth.signOut();
    },

    // 当前登录用户档案（含审核状态）
    async myProfile() {
      const { data, error } = await supabase.rpc('my_profile');
      if (error) throw error;
      return (data && data[0]) || null;
    },

    async isAdmin() {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) throw error;
      return data === true;
    },

    async listProfiles() {
      const { data, error } = await supabase.rpc('list_profiles');
      if (error) throw error;
      return data || [];
    },

    async setProfileStatus(id, status, note) {
      const { error } = await supabase.rpc('set_profile_status', {
        target_id: id,
        new_status: status,
        new_note: note || null
      });
      if (error) throw error;
    },

    escapeHtml,
    fmtTime
  };
})();
