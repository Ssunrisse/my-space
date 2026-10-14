(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cfg = window.MYSPACE_SUPABASE;
  const message = text => { $('auth-message').textContent = text; };
  const validConfig = cfg && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.url) &&
    typeof cfg.publishableKey === 'string' && !cfg.publishableKey.startsWith('YOUR_');
  if (!validConfig || !window.supabase?.createClient) {
    message('Account setup is incomplete. Configure auth-config.js and load this page through Live Server.');
    $('auth-submit').disabled = true;
    return;
  }
  const client = window.supabase.createClient(cfg.url, cfg.publishableKey);
  let mode = 'signin';
  let recovering = false;
  let busy = false;
  function setBusy(next) {
    busy = next;
    $('auth-submit').disabled = next;
    $('auth-signout').disabled = next;
    $('auth-forgot').disabled = next;
  }
  function chooseMode(next) {
    mode = next;
    $('auth-title').textContent = next === 'signin' ? 'Sign in' : 'Create account';
    $('auth-submit').textContent = next === 'signin' ? 'Sign in' : 'Create account';
    $('auth-password').autocomplete = next === 'signin' ? 'current-password' : 'new-password';
    $('tab-signin').classList.toggle('selected', next === 'signin');
    $('tab-signup').classList.toggle('selected', next === 'signup');
    $('tab-signin').setAttribute('aria-pressed', String(next === 'signin'));
    $('tab-signup').setAttribute('aria-pressed', String(next === 'signup'));
    $('auth-forgot').hidden = next !== 'signin';
    message('');
  }
  function showMember(user) {
    $('auth-recovery').hidden = true;
    $('auth-guest').hidden = Boolean(user);
    $('auth-member').hidden = !user;
    if (user) $('auth-member-email').textContent = user.email || 'Signed-in account';
  }
  function showRecovery() {
    recovering = true;
    $('auth-guest').hidden = true;
    $('auth-member').hidden = true;
    $('auth-recovery').hidden = false;
    message('Enter a new password for your account.');
  }
  $('tab-signin').addEventListener('click', () => chooseMode('signin'));
  $('tab-signup').addEventListener('click', () => chooseMode('signup'));
  $('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    const email = $('auth-email').value.trim();
    const password = $('auth-password').value;
    setBusy(true);
    try {
      const result = mode === 'signup'
        ? await client.auth.signUp({ email, password, options: { emailRedirectTo: new URL('auth.html', location.href).href } })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === 'signup' && !result.data.session) {
        message('Check your email to confirm your account, then sign in.');
      } else if (result.data.user) {
        showMember(result.data.user);
        message(mode === 'signup' ? 'Account created and signed in.' : 'Signed in successfully.');
      }
    } catch (error) { message(error.message || 'Authentication failed.'); }
    finally { setBusy(false); }
  });
  $('auth-forgot').addEventListener('click', async () => {
    if (busy) return;
    const email = $('auth-email').value.trim();
    if (!email || !$('auth-email').checkValidity()) {
      message('Enter a valid email address first.');
      $('auth-email').focus();
      return;
    }
    setBusy(true);
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('auth.html', location.href).href
      });
      if (error) throw error;
      message('If that address is registered, a reset email will arrive shortly.');
    } catch (error) { message(error.message || 'Could not send reset email.'); }
    finally { setBusy(false); }
  });
  $('recovery-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await client.auth.updateUser({ password: $('recovery-password').value });
      if (error) throw error;
      recovering = false;
      const { data } = await client.auth.getUser();
      showMember(data.user);
      message('Password updated successfully.');
      $('recovery-password').value = '';
    } catch (error) { message(error.message || 'Could not update password.'); }
    finally { setBusy(false); }
  });
  $('auth-signout').addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      showMember(null);
      chooseMode('signin');
      message('Signed out successfully. Your browser-local data has not been erased.');
    } catch (error) { message(error.message || 'Could not sign out.'); }
    finally { setBusy(false); }
  });
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      showRecovery();
    } else if (event === 'SIGNED_OUT') {
      recovering = false;
      showMember(null);
    } else if (session?.user && !recovering) {
      showMember(session.user);
    }
  });
  (async () => {
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!recovering) showMember(data.session?.user || null);
      // Recovery redirects can arrive with a hash token.
      if (location.hash.includes('type=recovery')) showRecovery();
    } catch (error) { message(error.message || 'Could not load your session.'); }
  })();
})();
