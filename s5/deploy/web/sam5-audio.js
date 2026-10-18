// Tablets got no sound: the launcher calls AudioContext.resume() on the first pointerdown, but a touch
// pointerdown is not a user activation in Chrome, so that promise stays pending (context "not allowed
// to start"). The launcher caches the pending unlock and every later tap or 소리 재생 press just waits
// on it, so sound never starts until reload. Calling resume() again inside a real activation event
// starts the context; the launcher's promise is then settled on the "running" state change, without
// relying on the browser to settle the earlier refused resume() call.
const Context = window.AudioContext ?? window.webkitAudioContext;
if (Context) {
  const contexts = new Set();
  const resume = Context.prototype.resume;
  Context.prototype.resume = function () {
    contexts.add(this);
    const pending = resume.call(this);
    return new Promise((resolve, reject) => {
      const running = () => {
        if (this.state !== 'running') return;
        this.removeEventListener('statechange', running);
        resolve();
      };
      this.addEventListener('statechange', running);
      pending.then(resolve, reject);
    });
  };
  const kick = () => {
    for (const c of contexts) {
      if (c.state === 'closed') contexts.delete(c);
      else if (c.state !== 'running') resume.call(c).catch(() => {});
    }
  };
  // The events Chrome counts as user activation (touch pointerdown is not one of them).
  for (const type of ['pointerup', 'touchend', 'click', 'keydown']) addEventListener(type, kick, { capture: true });
}
