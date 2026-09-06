$(function () {
  // --- РАЗБЛОКИРОВКА ПРИ ПЕРВОМ КАСАНИИ ---
  let audioUnlocked = false;

  function unlockAudioOnFirstGesture() {
    if (audioUnlocked) return;
    const ctx = ensureAudioContextSync();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    audioUnlocked = true;
    try {
      const s = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
      s.play().catch(() => { });
      setTimeout(() => { s.src = ''; }, 100);
    } catch (e) { }
  }

  $(document).one('click touchstart', unlockAudioOnFirstGesture);

  // --- ГАРАНТИРОВАННОЕ ПОЛУЧЕНИЕ ЖИВОГО AUDIO CONTEXT ---
  function ensureAudioContextSync() {
    if (!window._audioCtx || window._audioCtx.state === 'closed') {
      window._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window._audioCtx.state === 'suspended') {
      try {
        window._audioCtx.resume();
        let waited = 0;
        while (window._audioCtx.state !== 'running' && waited < 300) {
          waited += 10;
        }
      } catch (e) { }
    }
    return window._audioCtx;
  }

  function unlockHtmlAudio() {
    try {
      const s = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
      s.play().catch(() => { });
      setTimeout(() => { s.src = ''; }, 100);
    } catch (e) { }
  }

  // --- DTMF ---
  const dtmfFrequencies = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1468],
    '+': [941, 1477]
  };

  function playTone(digit) {
    if (!dtmfFrequencies[digit]) return;
    unlockHtmlAudio();
    const ctx = ensureAudioContextSync();
    if (!ctx || ctx.state !== 'running') return;

    const [f1, f2] = dtmfFrequencies[digit];
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.frequency.value = f1;
    osc2.frequency.value = f2;
    osc1.type = 'sine';
    osc2.type = 'sine';

    const start = ctx.currentTime;
    const duration = 0.1;
    gain.gain.setValueAtTime(0.1, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(start);
    osc2.start(start);
    osc1.stop(start + duration);
    osc2.stop(start + duration);
    setTimeout(() => {
      try { osc1.disconnect(); osc2.disconnect(); gain.disconnect(); } catch (e) { }
    }, duration * 1000 + 50);
  }

  // --- ГУДКИ ---
  let ringingNodes = [];
  let ringingTimer = null;

  function playRinging(totalDuration, onDone) {
    stopRinging();
    const ctx = ensureAudioContextSync();
    if (!ctx || ctx.state !== 'running') {
      if (onDone) onDone();
      return;
    }
    unlockHtmlAudio();
    const ringOn = 1.0, ringOff = 2.0;
    let t = ctx.currentTime;
    const endTime = t + totalDuration;
    while (t < endTime) {
      const dur = Math.min(ringOn, endTime - t);
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.frequency.value = 425;
      osc2.frequency.value = 425;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
      gain.gain.setValueAtTime(0.1, t + dur - 0.1);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + dur);
      osc2.stop(t + dur);
      ringingNodes.push(osc1, osc2, gain);
      t += ringOn + ringOff;
    }
    ringingTimer = setTimeout(() => {
      stopRinging();
      if (onDone) onDone();
    }, totalDuration * 1000);
  }

  function stopRinging() {
    if (ringingTimer) { clearTimeout(ringingTimer); ringingTimer = null; }
    ringingNodes.forEach(n => { try { n.disconnect(); } catch (e) { } });
    ringingNodes = [];
  }

  function playAudioFile(src, onEnd) {
    if (!src) {
      if (onEnd) onEnd();
      return;
    }

    if (activeAudio) {
      try { 
        if (activeAudio.stop) activeAudio.stop(); 
        else if (activeAudio.pause) { activeAudio.pause(); activeAudio.currentTime = 0; }
      } catch (e) { }
      activeAudio = null;
    }

    const audio = new Audio(src);
    audio.volume = 0.5;
    audio.onended = function () {
      if (activeAudio === audio) activeAudio = null;
      if (onEnd && !isCallOffInProgress) onEnd();
    };
    audio.play().catch(err => {
      console.error("Audio play error", err);
      if (onEnd) onEnd();
    });
    activeAudio = audio;
  }

  // --- ИНТЕРФЕЙС ---
  const $display = $('#timer');
  const $buttons = $('.keypad button.num');
  const $input = $('#main-number');
  const $delete = $('#del-btn');
  const $extraInput = $('#extra-code');
  const $call = $('#call-trigger');

  let callOn = false;
  let awaitingExtra = false;
  let activeAudio = null;          // теперь это BufferSource (или null)
  let s = 0, m = 0;
  let timerInterval = null;
  let isCallOffInProgress = false;

  function updateTimer() {
    if (s === 59) { m++; s = 0; } else s++;
    $display.text((m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s);
  }

  function startTimer() {
    $display.addClass('show');
    if (!timerInterval) {
      timerInterval = setInterval(updateTimer, 1000);
      updateTimer();
    }
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    s = 0; m = 0;
    $display.text('00:00').removeClass('show');
  }

  // --- ОСТАНОВКА (обновлена для BufferSource) ---
  function callOff() {
    if (isCallOffInProgress) return;
    isCallOffInProgress = true;
    stopRinging();
    if (activeAudio) {
      try { 
        if (activeAudio.stop) activeAudio.stop(); 
        else if (activeAudio.pause) { activeAudio.pause(); activeAudio.currentTime = 0; }
      } catch (e) { }
      activeAudio = null;
    }
    $call.removeClass('red');
    stopTimer();
    callOn = false;
    awaitingExtra = false;
    $input.removeClass('call').addClass('hide');
    setTimeout(() => {
      $input.removeClass('hide').val('');
    }, 500);
    $extraInput.text('').hide();
    $delete.removeClass('show');
    isCallOffInProgress = false;
  }

  function callStart() {
    if (callOn) { callOff(); return; }
    $call.addClass('red');
    callOn = true;
    $input.addClass('call');
    $delete.removeClass('show');
  }

  // --- ОБРАБОТЧИКИ ---
  function handleDigit(newDigit) {
    playTone(newDigit);
    if (!callOn) {
      const cur = $input.val() || '';
      if (cur.length < 11) {
        if (newDigit === '+' && cur.length > 0) return;
        $input.val(cur + newDigit);
      }
    } else if (awaitingExtra) {
      if (newDigit === '#') return;
      let cur = $extraInput.text().replace('#', '');
      if (cur.length >= 5) return;
      cur += newDigit;
      $extraInput.text('#' + cur);
      if (cur.length === 5) checkExtraCode(cur);
    }
    if ($input.val().length > 0) $delete.addClass('show');
  }

  function checkExtraCode(digits) {
    let src;
    if (digits === '75095') src = './audio/75095.mp3';
    else if (digits === '75148') src = './audio/75148.mp3';
    else src = './audio/nevern_dop.mp3';

    playRinging(3, () => {
      if (!callOn) return;
      playAudioFile(src, () => { });
      $extraInput.text('#');
      $delete.removeClass('show');
    });
  }

  function handleCallButton() {
    unlockHtmlAudio();
    const ctx = ensureAudioContextSync();
    if (!ctx || ctx.state !== 'running') {
      window._audioCtx = null;
      ensureAudioContextSync();
      if (!window._audioCtx || window._audioCtx.state !== 'running') {
        console.warn('Не удалось запустить AudioContext');
        return;
      }
    }

    if (callOn) { callOff(); return; }

    const num = $input.val().replace(/^\+/, '');

    const callWithRinging = (src) => {
      callStart();
      const duration = Math.floor(Math.random() * 8) + 3;
      playRinging(duration, () => {
        if (!callOn) return;
        startTimer();
        playAudioFile(src, () => callOff());
      });
    };

    const callWithoutRinging = (src) => {
      callStart();
      startTimer();
      playAudioFile(src, () => callOff());
    };

    if (num === '5508808080') {
      callStart();
      playRinging(2, () => {
        if (!callOn) return;
        startTimer();
        awaitingExtra = true;
        $extraInput.text('#').show();
        playAudioFile('./audio/5508808080.mp3');
      });
    } else if (num === '5508756314') {
      callWithRinging('./audio/5508756314.mp3');
    } else if (num === '5508947279') {
      callWithRinging('./audio/5508947279.mp3');
    } else if (num === '5508144909') {
      callWithRinging('./audio/5508144909.mp3');
    } else if (num === '5506203050') {
      callWithRinging('./audio/5506203050.mp3');
    } else {
      callWithoutRinging('./audio/nevern.mp3');
    }
  }

  // --- СОБЫТИЯ ---
  let lastTouchEnd = 0;
  $buttons.on('touchend click', function (e) {
    e.preventDefault();
    const now = Date.now();
    if (e.type === 'click' && now - lastTouchEnd < 300) return;
    lastTouchEnd = now;
    handleDigit($(this).data('num'));
  });

  $delete.on('click', function (e) {
    e.preventDefault();
    if (!callOn) {
      const nv = ($input.val() || '').slice(0, -1);
      $input.val(nv);
      if (nv.length === 0) $delete.removeClass('show');
    } else if (awaitingExtra) {
      const digits = $extraInput.text().replace('#', '').slice(0, -1);
      $extraInput.text('#' + digits);
    }
  });

  let lastCallTouchEnd = 0;
  $call.on('touchend click', function (e) {
    e.preventDefault();
    const now = Date.now();
    if (e.type === 'click' && now - lastCallTouchEnd < 300) return;
    lastCallTouchEnd = now;
    handleCallButton();
  });
});
