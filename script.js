/**
 * ==============================================================================
 * MOBILE NUMBER VALIDATOR USING DFA - JAVASCRIPT ENGINE
 * Language: L = { w ∈ {0,1,2,3,4,5,6,7,8,9}^10 | first digit ∈ {6,7,8,9} }
 * States: Q = { q0, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, qD }
 * Pure Vanilla JavaScript - No Frameworks
 * ==============================================================================
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. DFA FORMAL SPECIFICATIONS
  // ---------------------------------------------------------------------------
  const DFA = {
    states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'qD'],
    startState: 'q0',
    acceptState: 'q10',
    deadState: 'qD',
    validStartDigits: ['6', '7', '8', '9'],
    alphabetDigits: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],

    stateDescriptions: {
      q0: 'Initial state. 0 digits processed. Awaiting first digit.',
      q1: '1 valid digit processed (started with 6, 7, 8, or 9).',
      q2: '2 valid digits processed.',
      q3: '3 valid digits processed.',
      q4: '4 valid digits processed.',
      q5: '5 valid digits processed.',
      q6: '6 valid digits processed.',
      q7: '7 valid digits processed.',
      q8: '8 valid digits processed.',
      q9: '9 valid digits processed. Needs 1 more digit for completion.',
      q10: 'Accept state: Exactly 10 valid digits processed.',
      qD: 'Dead/Trap state: Irrecoverable syntax or length violation.'
    },

    /**
     * Total Transition Function δ: Q × Σ → Q
     * @param {string} state - Current state (e.g., 'q0', 'q1')
     * @param {string} symbol - Current input symbol (character)
     * @returns {Object} Transition result { nextState, isValid, reason, colType }
     */
    transition(state, symbol) {
      // Rule 1: From Dead State qD, all symbols trap in qD
      if (state === 'qD') {
        return {
          nextState: 'qD',
          isValid: false,
          reason: `Trapped in dead state qD on symbol '${symbol}'.`,
          colType: 'other'
        };
      }

      // Rule 2: From Accept State q10, ANY additional symbol moves to qD
      if (state === 'q10') {
        const isDigit = DFA.alphabetDigits.includes(symbol);
        return {
          nextState: 'qD',
          isValid: false,
          reason: `Extra character '${symbol}' detected after 10 digits. Maximum allowed length is 10.`,
          colType: isDigit ? (DFA.validStartDigits.includes(symbol) ? 'valid-start' : 'invalid-start') : 'other'
        };
      }

      // Rule 3: From Start State q0
      if (state === 'q0') {
        if (DFA.validStartDigits.includes(symbol)) {
          return {
            nextState: 'q1',
            isValid: true,
            reason: `Valid initial digit '${symbol}' ∈ {6,7,8,9} (Standard Indian mobile prefix).`,
            colType: 'valid-start'
          };
        } else if (['0', '1', '2', '3', '4', '5'].includes(symbol)) {
          return {
            nextState: 'qD',
            isValid: false,
            reason: `First digit cannot be '${symbol}'. Indian mobile numbers must start with 6, 7, 8, or 9.`,
            colType: 'invalid-start'
          };
        } else {
          return {
            nextState: 'qD',
            isValid: false,
            reason: `Character '${symbol}' is a non-digit symbol (⊥) and not a decimal digit; Σ = {0-9} ∪ {⊥}.`,
            colType: 'other'
          };
        }
      }

      // Rule 4: Intermediate States q1 through q9
      const stateIndex = parseInt(state.replace('q', ''), 10);
      if (stateIndex >= 1 && stateIndex <= 9) {
        if (DFA.alphabetDigits.includes(symbol)) {
          const nextIndex = stateIndex + 1;
          const isFinal = nextIndex === 10;
          return {
            nextState: `q${nextIndex}`,
            isValid: true,
            reason: isFinal 
              ? `Digit 10 ('${symbol}') processed. Reached final accepting state q10!` 
              : `Digit ${nextIndex} ('${symbol}') processed successfully.`,
            colType: DFA.validStartDigits.includes(symbol) ? 'valid-start' : 'invalid-start'
          };
        } else {
          return {
            nextState: 'qD',
            isValid: false,
            reason: `Illegal character '${symbol}' at position ${stateIndex + 1}. Expected decimal digit.`,
            colType: 'other'
          };
        }
      }

      return {
        nextState: 'qD',
        isValid: false,
        reason: `Undefined transition from state ${state} on '${symbol}'.`,
        colType: 'other'
      };
    }
  };

  // ---------------------------------------------------------------------------
  // 2. APPLICATION STATE
  // ---------------------------------------------------------------------------
  const state = {
    inputString: '',
    currentState: 'q0',
    currentStepIndex: 0,
    stepsTotal: 0,
    isRunning: false,
    isPaused: false,
    simulationTimer: null,
    stepDelay: 600, // Medium speed (ms)
    executionHistory: [],
    audioMuted: true,
    audioContext: null,
    activeArrowElement: null
  };

  // ---------------------------------------------------------------------------
  // 3. DOM ELEMENT REFERENCES
  // ---------------------------------------------------------------------------
  const DOM = {
    // Hero & Input elements
    mobileInput: document.getElementById('mobile-input'),
    clearInputBtn: document.getElementById('clear-input-btn'),
    heroDisplayNumber: document.getElementById('hero-display-number'),
    heroStatusPill: document.getElementById('hero-status-pill'),
    heroCurrentState: document.getElementById('hero-current-state'),
    charCount: document.getElementById('char-count'),
    realtimeHint: document.getElementById('realtime-hint'),

    // Control buttons & speed
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    stepBtn: document.getElementById('step-btn'),
    resetBtn: document.getElementById('reset-btn'),
    centerSimFab: document.getElementById('center-sim-fab'),
    simStatusBadge: document.getElementById('sim-status-badge'),
    speedPills: document.querySelectorAll('.speed-pill'),

    // Digit Stream
    digitsContainer: document.getElementById('digits-container'),

    // Result notification banner
    resultBanner: document.getElementById('result-banner'),
    resultIcon: document.getElementById('result-icon'),
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    resultDiagnostics: document.getElementById('result-diagnostics'),
    resultDismissBtn: document.getElementById('result-dismiss-btn'),

    // SVG elements
    dfaSvg: document.getElementById('dfa-svg'),
    dfaSvgWrapper: document.getElementById('dfa-svg-wrapper'),
    resetZoomBtn: document.getElementById('reset-zoom-btn'),
    transParticle: document.getElementById('trans-particle'),
    nodeInspector: document.getElementById('node-inspector'),
    inspectorTitle: document.getElementById('inspector-title'),
    inspectorDesc: document.getElementById('inspector-desc'),
    inspectorRulesList: document.getElementById('inspector-rules-list'),
    closeInspectorBtn: document.getElementById('close-inspector-btn'),

    // Live Metrics
    metricCurrentState: document.getElementById('metric-current-state'),
    metricStateType: document.getElementById('metric-state-type'),
    metricCurrentInput: document.getElementById('metric-current-input'),
    metricInputIndex: document.getElementById('metric-input-index'),
    metricTransitionFormula: document.getElementById('metric-transition-formula'),
    metricTransitionDesc: document.getElementById('metric-transition-desc'),
    metricNextState: document.getElementById('metric-next-state'),
    metricProgressPercent: document.getElementById('metric-progress-percent'),
    simProgressBar: document.getElementById('sim-progress-bar'),
    progressStepText: document.getElementById('progress-step-text'),
    progressPercentageText: document.getElementById('progress-percentage-text'),

    // Execution Log
    logTableBody: document.getElementById('log-table-body'),
    copyLogBtn: document.getElementById('copy-log-btn'),
    clearLogBtn: document.getElementById('clear-log-btn'),

    // Transition Table
    transitionTable: document.getElementById('transition-table'),

    // Transition Explorer
    explorerStateSelect: document.getElementById('explorer-state-select'),
    explorerSymbolInput: document.getElementById('explorer-symbol-input'),
    explorerFormula: document.getElementById('explorer-formula'),
    explorerReason: document.getElementById('explorer-reason'),
    explorerTestBtn: document.getElementById('explorer-test-btn'),

    // Header actions
    soundToggleBtn: document.getElementById('sound-toggle-btn'),
    soundIcon: document.getElementById('sound-icon'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeIcon: document.getElementById('theme-icon'),

    // Confetti canvas
    confettiCanvas: document.getElementById('confetti-canvas')
  };

  // ---------------------------------------------------------------------------
  // 4. AUDIO SYNTHESIZER (WEB AUDIO API)
  // ---------------------------------------------------------------------------
  function getAudioContext() {
    if (!state.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        state.audioContext = new AudioCtx();
      }
    }
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
    return state.audioContext;
  }

  function playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
    if (state.audioMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(gainVal, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  function playSoundStep() {
    playTone(620, 'triangle', 0.08, 0.12);
  }

  function playSoundAccept() {
    if (state.audioMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => playTone(freq, 'sine', 0.22, 0.18), idx * 110);
    });
  }

  function playSoundReject() {
    if (state.audioMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);

      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 5. CONFETTI GENERATOR (PURE HTML5 CANVAS)
  // ---------------------------------------------------------------------------
  let confettiAnimationId = null;
  const confettiParticles = [];

  function triggerConfetti() {
    const canvas = DOM.confettiCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    confettiParticles.length = 0;
    const colors = ['#ec4899', '#f43f5e', '#d946ef', '#8b5cf6', '#10b981', '#38bdf8'];

    for (let i = 0; i < 90; i++) {
      confettiParticles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 220,
        y: canvas.height * 0.4,
        w: Math.random() * 8 + 6,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.8) * 16 - 2,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      confettiParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4;
        p.rot += p.rotSpeed;
        p.alpha -= 0.008;

        if (p.alpha > 0 && p.y < canvas.height) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });

      if (alive) {
        confettiAnimationId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animate();
  }

  // ---------------------------------------------------------------------------
  // 6. REAL-TIME INPUT VALIDATION (WHILE TYPING)
  // ---------------------------------------------------------------------------
  function updateInputDiagnostics() {
    const rawVal = DOM.mobileInput.value;
    const len = rawVal.length;
    DOM.charCount.textContent = len;
    DOM.clearInputBtn.style.display = len > 0 ? 'block' : 'none';

    // Update big display number
    DOM.heroDisplayNumber.textContent = len > 0 ? `+91 ${rawVal}` : '+91 —';

    if (len === 0) {
      DOM.heroStatusPill.textContent = 'AWAITING INPUT';
      DOM.realtimeHint.textContent = 'Enter 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
      return;
    }

    const firstChar = rawVal[0];
    const isFirstValid = DFA.validStartDigits.includes(firstChar);
    const hasNonDigit = /[^\d]/.test(rawVal);

    if (hasNonDigit) {
      DOM.heroStatusPill.textContent = 'ILLEGAL CHARACTER';
      DOM.realtimeHint.textContent = 'Non-digit detected. Only decimal digits 0–9 are allowed.';
    } else if (!isFirstValid) {
      DOM.heroStatusPill.textContent = 'INVALID PREFIX';
      DOM.realtimeHint.textContent = `First digit '${firstChar}' is invalid. Mobile numbers must start with 6, 7, 8, or 9.`;
    } else if (len < 10) {
      DOM.heroStatusPill.textContent = `${10 - len} DIGITS NEEDED`;
      DOM.realtimeHint.textContent = `Valid prefix '${firstChar}'. Add ${10 - len} more digit${10 - len > 1 ? 's' : ''}.`;
    } else if (len === 10) {
      DOM.heroStatusPill.textContent = 'FORMAT VALID';
      DOM.realtimeHint.textContent = 'Ready for DFA simulation! Click "Validate & Simulate".';
    } else {
      DOM.heroStatusPill.textContent = 'LENGTH EXCEEDED';
      DOM.realtimeHint.textContent = `Contains ${len} digits. Maximum allowed is exactly 10 digits.`;
    }
  }

  // ---------------------------------------------------------------------------
  // 7. DIGIT STREAM VISUALIZATION
  // ---------------------------------------------------------------------------
  function renderDigitChips(str) {
    DOM.digitsContainer.innerHTML = '';
    if (!str || str.length === 0) {
      DOM.digitsContainer.innerHTML = '<div style="color:var(--text-subtle);font-size:0.85rem;padding:12px;">Enter a mobile number to view digit breakdown.</div>';
      return;
    }

    const chars = str.split('');
    chars.forEach((char, idx) => {
      const chip = document.createElement('div');
      chip.className = 'digit-chip remaining';
      chip.id = `digit-chip-${idx}`;
      chip.innerHTML = `
        <span class="chip-val">${char}</span>
        <span class="chip-idx">D${idx + 1}</span>
      `;
      DOM.digitsContainer.appendChild(chip);
    });
  }

  function updateDigitChipsUI(activeIdx, isDeadState) {
    const chips = DOM.digitsContainer.querySelectorAll('.digit-chip');
    chips.forEach((chip, idx) => {
      chip.classList.remove('processed', 'current', 'failed', 'remaining');

      if (idx < activeIdx) {
        chip.classList.add('processed');
      } else if (idx === activeIdx) {
        if (isDeadState) {
          chip.classList.add('failed');
        } else {
          chip.classList.add('current');
        }
      } else {
        chip.classList.add('remaining');
      }
    });

    const currentChip = document.getElementById(`digit-chip-${activeIdx}`);
    if (currentChip) {
      currentChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  // ---------------------------------------------------------------------------
  // 8. SVG DFA HIGHLIGHTS & ANIMATION
  // ---------------------------------------------------------------------------
  function highlightStateNode(stateKey) {
    const allNodes = document.querySelectorAll('.dfa-node');
    allNodes.forEach((node) => {
      node.classList.remove('active-state', 'active-accept', 'active-dead');
    });

    const targetNode = document.getElementById(`node-${stateKey.toLowerCase()}`);
    if (!targetNode) return;

    if (stateKey === 'q10') {
      targetNode.classList.add('active-accept');
    } else if (stateKey === 'qD') {
      targetNode.classList.add('active-dead');
    } else {
      targetNode.classList.add('active-state');
    }

    DOM.heroCurrentState.textContent = stateKey;
  }

  function highlightTransitionArrow(fromState, toState) {
    if (state.activeArrowElement) {
      state.activeArrowElement.classList.remove('active-arrow', 'active-arrow-accept', 'active-arrow-dead');
      state.activeArrowElement = null;
    }

    let arrowId = null;
    if (fromState === 'q0' && toState === 'q1') arrowId = 'trans-q0-q1';
    else if (fromState === 'q1' && toState === 'q2') arrowId = 'trans-q1-q2';
    else if (fromState === 'q2' && toState === 'q3') arrowId = 'trans-q2-q3';
    else if (fromState === 'q3' && toState === 'q4') arrowId = 'trans-q3-q4';
    else if (fromState === 'q4' && toState === 'q5') arrowId = 'trans-q4-q5';
    else if (fromState === 'q5' && toState === 'q6') arrowId = 'trans-q5-q6';
    else if (fromState === 'q6' && toState === 'q7') arrowId = 'trans-q6-q7';
    else if (fromState === 'q7' && toState === 'q8') arrowId = 'trans-q7-q8';
    else if (fromState === 'q8' && toState === 'q9') arrowId = 'trans-q8-q9';
    else if (fromState === 'q9' && toState === 'q10') arrowId = 'trans-q9-q10';
    else if (fromState === 'q0' && toState === 'qD') arrowId = 'trans-q0-qd';
    else if (fromState === 'q10' && toState === 'qD') arrowId = 'trans-q10-qd';
    else if (fromState === 'qD' && toState === 'qD') arrowId = 'trans-qd-loop';
    else if (toState === 'qD') arrowId = 'trans-fail-generic';

    if (arrowId) {
      const arrow = document.getElementById(arrowId);
      if (arrow) {
        state.activeArrowElement = arrow;
        if (toState === 'q10') {
          arrow.classList.add('active-arrow-accept');
        } else if (toState === 'qD') {
          arrow.classList.add('active-arrow-dead');
        } else {
          arrow.classList.add('active-arrow');
        }

        animatePulseAlongPath(arrow, toState === 'qD' ? '#ef4444' : toState === 'q10' ? '#10b981' : '#ec4899');
      }
    }
  }

  function animatePulseAlongPath(pathElement, color) {
    const particle = DOM.transParticle;
    if (!particle || !pathElement) return;

    try {
      const totalLen = pathElement.getTotalLength();
      particle.setAttribute('fill', color);
      particle.classList.remove('hidden');

      const startPt = pathElement.getPointAtLength(0);
      particle.setAttribute('cx', startPt.x);
      particle.setAttribute('cy', startPt.y);

      const startTime = performance.now();
      const animDuration = Math.min(state.stepDelay * 0.7, 380);

      function stepAnim(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / animDuration, 1);
        const currentPt = pathElement.getPointAtLength(progress * totalLen);

        particle.setAttribute('cx', currentPt.x);
        particle.setAttribute('cy', currentPt.y);

        if (progress < 1) {
          requestAnimationFrame(stepAnim);
        } else {
          setTimeout(() => {
            particle.classList.add('hidden');
          }, 80);
        }
      }

      requestAnimationFrame(stepAnim);
    } catch (e) {
      particle.classList.add('hidden');
    }
  }

  // ---------------------------------------------------------------------------
  // 9. TRANSITION TABLE LIVE HIGHLIGHT
  // ---------------------------------------------------------------------------
  function highlightTransitionTable(fromState, colType) {
    const prevRows = DOM.transitionTable.querySelectorAll('.active-row');
    const prevCells = DOM.transitionTable.querySelectorAll('.active-cell');
    prevRows.forEach((r) => r.classList.remove('active-row'));
    prevCells.forEach((c) => c.classList.remove('active-cell'));

    if (!fromState) return;

    const rowId = `row-${fromState.toLowerCase()}`;
    const row = document.getElementById(rowId);
    if (!row) return;

    row.classList.add('active-row');
    if (colType) {
      const cell = row.querySelector(`td[data-col="${colType}"]`);
      if (cell) {
        cell.classList.add('active-cell');
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 10. EXECUTION LOG (MOBILE CONTACT-CARD STYLE FROM SCREENSHOT)
  // ---------------------------------------------------------------------------
  function appendExecutionLog(entry) {
    const container = DOM.logTableBody;
    const emptyNotice = container.querySelector('.log-empty-card');
    if (emptyNotice) emptyNotice.remove();

    const card = document.createElement('div');
    card.className = `log-item-card ${entry.toState === 'qD' ? 'is-dead' : ''}`;

    card.innerHTML = `
      <div class="log-item-left">
        <div class="log-step-circle">#${entry.step}</div>
        <div class="log-info-wrap">
          <div class="log-title-row">
            ${entry.fromState} -- '${entry.symbol}' --> <strong>${entry.toState}</strong>
          </div>
          <div class="log-desc-text">${entry.reason}</div>
        </div>
      </div>
      <div class="log-badge-action">${entry.formula}</div>
    `;

    container.appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearExecutionLog() {
    state.executionHistory = [];
    DOM.logTableBody.innerHTML = `
      <div class="log-empty-card">
        No simulation steps recorded yet. Click "Validate &amp; Simulate" above.
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // 11. SIMULATION ENGINE (RUN, STEP, PAUSE, RESET)
  // ---------------------------------------------------------------------------
  function resetSimulation() {
    if (state.simulationTimer) {
      clearInterval(state.simulationTimer);
      state.simulationTimer = null;
    }

    state.isRunning = false;
    state.isPaused = false;
    state.currentState = 'q0';
    state.currentStepIndex = 0;
    state.stepsTotal = 0;

    // Reset Buttons
    DOM.startBtn.disabled = false;
    DOM.startBtn.innerHTML = '<span class="pill-icon">▶</span> Validate &amp; Simulate';
    DOM.pauseBtn.disabled = true;
    DOM.pauseBtn.innerHTML = '<span class="pill-icon">⏸</span> Pause';
    DOM.stepBtn.disabled = false;
    DOM.centerSimFab.innerHTML = '<span class="fab-icon">▶</span>';

    // Reset Metrics
    DOM.simStatusBadge.textContent = 'Status: Idle';
    DOM.simStatusBadge.className = 'pill-tag pill-neutral';
    DOM.metricCurrentState.textContent = 'q0';
    DOM.metricStateType.textContent = '(Start State)';
    DOM.metricCurrentInput.textContent = '—';
    DOM.metricInputIndex.textContent = 'Digit: None';
    DOM.metricTransitionFormula.textContent = 'δ(q0, ε) = q0';
    DOM.metricTransitionDesc.textContent = 'Waiting for simulation to start';
    DOM.metricNextState.textContent = '—';
    DOM.metricProgressPercent.textContent = '0% Completed';
    DOM.simProgressBar.style.width = '0%';
    DOM.progressStepText.textContent = '0 / 0 steps';
    DOM.progressPercentageText.textContent = '0%';

    // Clear Result Banner
    DOM.resultBanner.classList.add('hidden');
    DOM.resultBanner.classList.remove('success', 'failure');

    // Reset Visuals
    highlightStateNode('q0');
    if (state.activeArrowElement) {
      state.activeArrowElement.classList.remove('active-arrow', 'active-arrow-accept', 'active-arrow-dead');
      state.activeArrowElement = null;
    }
    DOM.transParticle.classList.add('hidden');
    highlightTransitionTable(null, null);

    renderDigitChips(DOM.mobileInput.value.trim());
    clearExecutionLog();
    updateInputDiagnostics();
  }

  function prepareSimulation() {
    const rawVal = DOM.mobileInput.value.trim();
    if (!rawVal) {
      DOM.realtimeHint.textContent = 'Please enter a mobile number to simulate.';
      DOM.mobileInput.focus();
      return false;
    }

    resetSimulation();
    state.inputString = rawVal;
    state.stepsTotal = rawVal.length;
    state.currentState = 'q0';
    state.currentStepIndex = 0;

    renderDigitChips(rawVal);
    highlightStateNode('q0');
    return true;
  }

  function executeSingleStep() {
    if (state.currentStepIndex >= state.stepsTotal) {
      finalizeSimulation();
      return false;
    }

    const stepNum = state.currentStepIndex + 1;
    const symbol = state.inputString[state.currentStepIndex];
    const fromState = state.currentState;

    const result = DFA.transition(fromState, symbol);
    const toState = result.nextState;
    const formulaStr = `δ(${fromState}, '${symbol}') = ${toState}`;

    // Metrics update
    DOM.metricCurrentState.textContent = fromState;
    DOM.metricStateType.textContent = fromState === 'q0' ? '(Start State)' : fromState === 'q10' ? '(Accept State)' : fromState === 'qD' ? '(Dead State)' : `(${state.currentStepIndex} Digits)`;
    DOM.metricCurrentInput.textContent = `'${symbol}'`;
    DOM.metricInputIndex.textContent = `Digit ${stepNum} of ${state.stepsTotal}`;
    DOM.metricTransitionFormula.textContent = formulaStr;
    DOM.metricTransitionDesc.textContent = result.reason;
    DOM.metricNextState.textContent = toState;

    // Progress bar
    const progressPct = Math.round((stepNum / state.stepsTotal) * 100);
    DOM.simProgressBar.style.width = `${progressPct}%`;
    DOM.progressStepText.textContent = `${stepNum} / ${state.stepsTotal} steps`;
    DOM.progressPercentageText.textContent = `${progressPct}%`;
    DOM.metricProgressPercent.textContent = `${progressPct}% Completed`;

    // Traversal visual updates
    highlightTransitionArrow(fromState, toState);
    highlightStateNode(toState);
    highlightTransitionTable(fromState, result.colType);
    updateDigitChipsUI(state.currentStepIndex, toState === 'qD');

    // Sounds
    if (toState === 'qD') {
      playSoundReject();
    } else if (toState === 'q10' && stepNum === 10) {
      playSoundAccept();
    } else {
      playSoundStep();
    }

    // Append log card
    const logEntry = {
      step: stepNum,
      fromState: fromState,
      symbol: symbol,
      toState: toState,
      formula: formulaStr,
      reason: result.reason
    };
    state.executionHistory.push(logEntry);
    appendExecutionLog(logEntry);

    // Advance
    state.currentState = toState;
    state.currentStepIndex++;

    if (state.currentStepIndex >= state.stepsTotal) {
      finalizeSimulation();
      return false;
    }

    return true;
  }

  function finalizeSimulation() {
    if (state.simulationTimer) {
      clearInterval(state.simulationTimer);
      state.simulationTimer = null;
    }
    state.isRunning = false;
    state.isPaused = false;

    DOM.startBtn.disabled = false;
    DOM.startBtn.innerHTML = '<span class="pill-icon">🔄</span> Re-Simulate';
    DOM.pauseBtn.disabled = true;
    DOM.stepBtn.disabled = true;
    DOM.centerSimFab.innerHTML = '<span class="fab-icon">🔄</span>';

    const finalState = state.currentState;
    const totalProcessed = state.currentStepIndex;
    const isAccepted = finalState === DFA.acceptState && totalProcessed === 10;

    if (isAccepted) {
      DOM.simStatusBadge.textContent = 'Status: Accepted';
      DOM.simStatusBadge.className = 'pill-tag pill-success';
      DOM.heroStatusPill.textContent = 'ACCEPTED ✓';

      showResultBanner({
        success: true,
        title: 'Accepted! Valid Indian Mobile Number',
        message: 'The DFA reached final accepting state q10 in exactly 10 valid transitions.',
        diagnostics: `Condition satisfied: String begins with '${state.inputString[0]}' ∈ {6,7,8,9}, has exactly 10 decimal digits, and halts in q10 ∈ F.`
      });

      triggerConfetti();
      playSoundAccept();
    } else {
      DOM.simStatusBadge.textContent = 'Status: Rejected';
      DOM.simStatusBadge.className = 'pill-tag pill-danger';
      DOM.heroStatusPill.textContent = 'REJECTED ✕';

      let failTitle = 'Rejected! Invalid Mobile Number';
      let failMsg = '';
      let failDiag = '';

      if (finalState === 'qD') {
        const failureStep = state.executionHistory.find((e) => e.toState === 'qD');
        const failSym = failureStep ? failureStep.symbol : '?';
        const failIdx = failureStep ? failureStep.step : 1;

        failMsg = `The automaton diverged to dead state qD at step ${failIdx} on input symbol '${failSym}'.`;
        failDiag = failureStep ? failureStep.reason : 'Automaton transitioned to trap state.';
      } else {
        failMsg = `Incomplete number: Input halted at intermediate state ${finalState} after only ${totalProcessed} digits.`;
        failDiag = `Indian mobile numbers require exactly 10 digits. Missing ${10 - totalProcessed} digits. Halting state ${finalState} ∉ F.`;
      }

      showResultBanner({
        success: false,
        title: failTitle,
        message: failMsg,
        diagnostics: failDiag
      });

      playSoundReject();
    }
  }

  function showResultBanner({ success, title, message, diagnostics }) {
    DOM.resultBanner.classList.remove('hidden', 'success', 'failure');
    DOM.resultBanner.classList.add(success ? 'success' : 'failure');

    DOM.resultIcon.textContent = success ? '✓' : '✕';
    DOM.resultTitle.textContent = title;
    DOM.resultMessage.textContent = message;
    DOM.resultDiagnostics.innerHTML = `<strong>DFA Diagnostics:</strong> ${diagnostics}`;
    DOM.resultBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function startAutoSimulation() {
    if (!state.isRunning) {
      const prepared = prepareSimulation();
      if (!prepared) return;

      state.isRunning = true;
      state.isPaused = false;
      DOM.startBtn.disabled = true;
      DOM.pauseBtn.disabled = false;
      DOM.stepBtn.disabled = false;
      DOM.centerSimFab.innerHTML = '<span class="fab-icon">⏸</span>';
      DOM.simStatusBadge.textContent = 'Status: Running';
      DOM.simStatusBadge.className = 'pill-tag pill-pink';

      runTimer();
    } else if (state.isPaused) {
      state.isPaused = false;
      DOM.pauseBtn.innerHTML = '<span class="pill-icon">⏸</span> Pause';
      DOM.centerSimFab.innerHTML = '<span class="fab-icon">⏸</span>';
      DOM.simStatusBadge.textContent = 'Status: Running';
      DOM.simStatusBadge.className = 'pill-tag pill-pink';
      runTimer();
    }
  }

  function runTimer() {
    if (state.simulationTimer) clearInterval(state.simulationTimer);
    state.simulationTimer = setInterval(() => {
      if (!state.isRunning || state.isPaused) {
        clearInterval(state.simulationTimer);
        return;
      }
      const hasMore = executeSingleStep();
      if (!hasMore) {
        clearInterval(state.simulationTimer);
      }
    }, state.stepDelay);
  }

  function pauseSimulation() {
    if (!state.isRunning) return;

    if (!state.isPaused) {
      state.isPaused = true;
      if (state.simulationTimer) clearInterval(state.simulationTimer);
      DOM.pauseBtn.innerHTML = '<span class="pill-icon">▶</span> Resume';
      DOM.centerSimFab.innerHTML = '<span class="fab-icon">▶</span>';
      DOM.simStatusBadge.textContent = 'Status: Paused';
      DOM.simStatusBadge.className = 'pill-tag pill-neutral';
    } else {
      startAutoSimulation();
    }
  }

  function stepManualSimulation() {
    if (!state.isRunning) {
      const prepared = prepareSimulation();
      if (!prepared) return;
      state.isRunning = true;
      state.isPaused = true;
      DOM.startBtn.disabled = false;
      DOM.startBtn.innerHTML = '<span class="pill-icon">▶</span> Auto';
      DOM.pauseBtn.disabled = false;
      DOM.pauseBtn.innerHTML = '<span class="pill-icon">▶</span> Resume';
      DOM.simStatusBadge.textContent = 'Status: Stepping';
      DOM.simStatusBadge.className = 'pill-tag pill-pink';
    } else if (state.isRunning && !state.isPaused) {
      pauseSimulation();
    }

    executeSingleStep();
  }

  // ---------------------------------------------------------------------------
  // 12. TRANSITION EXPLORER SANDBOX
  // ---------------------------------------------------------------------------
  function updateTransitionExplorer() {
    const selectedState = DOM.explorerStateSelect.value;
    let symbol = DOM.explorerSymbolInput.value;
    if (symbol.length === 0) symbol = '9';

    const result = DFA.transition(selectedState, symbol);
    DOM.explorerFormula.textContent = `δ(${selectedState}, '${symbol}') = ${result.nextState}`;
    DOM.explorerReason.textContent = result.reason;
  }

  function testExplorerInDiagram() {
    const selectedState = DOM.explorerStateSelect.value;
    let symbol = DOM.explorerSymbolInput.value;
    if (symbol.length === 0) symbol = '9';

    const result = DFA.transition(selectedState, symbol);
    highlightStateNode(selectedState);
    highlightTransitionArrow(selectedState, result.nextState);

    setTimeout(() => {
      highlightStateNode(result.nextState);
    }, 350);

    highlightTransitionTable(selectedState, result.colType);
  }

  // ---------------------------------------------------------------------------
  // 13. SVG INTERACTIVITY
  // ---------------------------------------------------------------------------
  function setupSvgInteractivity() {
    const nodes = document.querySelectorAll('.dfa-node');
    nodes.forEach((node) => {
      node.addEventListener('click', () => {
        const stateKey = node.getAttribute('data-state');
        showNodeInspector(stateKey);
      });
    });

    DOM.closeInspectorBtn.addEventListener('click', () => {
      DOM.nodeInspector.classList.add('hidden');
    });

    DOM.resetZoomBtn.addEventListener('click', () => {
      DOM.dfaSvgWrapper.scrollTo({ left: 0, behavior: 'smooth' });
    });
  }

  function showNodeInspector(stateKey) {
    DOM.inspectorTitle.textContent = `State Details: ${stateKey}`;
    DOM.inspectorDesc.textContent = DFA.stateDescriptions[stateKey] || 'DFA State definition.';

    let rulesHtml = '';
    if (stateKey === 'q0') {
      rulesHtml = `
        <li>δ(q0, [6,7,8,9]) → q1 (Valid Indian prefix)</li>
        <li>δ(q0, [0..5]) → qD (Invalid prefix)</li>
        <li>δ(q0, other) → qD (Non-digit)</li>
      `;
    } else if (stateKey === 'q10') {
      rulesHtml = `
        <li>Accept State (F = {q10})</li>
        <li>δ(q10, any) → qD (Length exceeded)</li>
      `;
    } else if (stateKey === 'qD') {
      rulesHtml = `
        <li>Dead / Trap State</li>
        <li>δ(qD, any) → qD (Trap loop)</li>
      `;
    } else {
      const idx = parseInt(stateKey.replace('q', ''), 10);
      const nextIdx = idx + 1;
      rulesHtml = `
        <li>δ(${stateKey}, [0..9]) → q${nextIdx}</li>
        <li>δ(${stateKey}, non-digit) → qD</li>
      `;
    }

    DOM.inspectorRulesList.innerHTML = rulesHtml;
    DOM.nodeInspector.classList.remove('hidden');
  }

  // ---------------------------------------------------------------------------
  // 14. EVENT LISTENERS
  // ---------------------------------------------------------------------------
  function setupEventListeners() {
    // Input typing
    DOM.mobileInput.addEventListener('input', () => {
      updateInputDiagnostics();
      renderDigitChips(DOM.mobileInput.value.trim());
    });

    DOM.mobileInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        startAutoSimulation();
      }
    });

    DOM.clearInputBtn.addEventListener('click', () => {
      DOM.mobileInput.value = '';
      resetSimulation();
      DOM.mobileInput.focus();
    });

    // Control buttons
    DOM.startBtn.addEventListener('click', startAutoSimulation);
    DOM.pauseBtn.addEventListener('click', pauseSimulation);
    DOM.stepBtn.addEventListener('click', stepManualSimulation);
    DOM.resetBtn.addEventListener('click', resetSimulation);

    // Floating center action button (FAB)
    DOM.centerSimFab.addEventListener('click', () => {
      if (!state.isRunning || state.isPaused) {
        startAutoSimulation();
      } else {
        pauseSimulation();
      }
    });

    // Speed selector pills
    DOM.speedPills.forEach((pill) => {
      pill.addEventListener('click', (e) => {
        DOM.speedPills.forEach((p) => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const speed = e.currentTarget.getAttribute('data-speed');
        if (speed === 'slow') state.stepDelay = 1200;
        else if (speed === 'fast') state.stepDelay = 220;
        else state.stepDelay = 600;

        if (state.isRunning && !state.isPaused) {
          runTimer();
        }
      });
    });

    // Result dismiss
    DOM.resultDismissBtn.addEventListener('click', () => {
      DOM.resultBanner.classList.add('hidden');
    });

    // Transition explorer inputs
    DOM.explorerStateSelect.addEventListener('change', updateTransitionExplorer);
    DOM.explorerSymbolInput.addEventListener('input', updateTransitionExplorer);
    DOM.explorerTestBtn.addEventListener('click', testExplorerInDiagram);

    // Execution log actions
    DOM.clearLogBtn.addEventListener('click', clearExecutionLog);

    DOM.copyLogBtn.addEventListener('click', () => {
      if (state.executionHistory.length === 0) {
        alert('No execution steps to copy.');
        return;
      }
      let markdown = '| Step | Source | Symbol | Destination | Formal Rule | Rationale |\n';
      markdown += '|---|---|---|---|---|---|\n';
      state.executionHistory.forEach((item) => {
        markdown += `| ${item.step} | ${item.fromState} | '${item.symbol}' | ${item.toState} | ${item.formula} | ${item.reason} |\n`;
      });

      if (navigator.clipboard) {
        navigator.clipboard.writeText(markdown).then(() => {
          DOM.copyLogBtn.textContent = '✓ Copied!';
          setTimeout(() => {
            DOM.copyLogBtn.textContent = '📋 Copy Log';
          }, 2000);
        });
      }
    });

    // Audio toggle
    DOM.soundToggleBtn.addEventListener('click', () => {
      state.audioMuted = !state.audioMuted;
      DOM.soundIcon.textContent = state.audioMuted ? '🔇' : '🔊';
      if (!state.audioMuted) {
        getAudioContext();
        playSoundStep();
      }
    });

    // Theme toggle
    DOM.themeToggleBtn.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      DOM.themeIcon.textContent = isLight ? '🌙' : '☀️';
    });
  }

  // ---------------------------------------------------------------------------
  // 15. INITIALIZATION
  // ---------------------------------------------------------------------------
  function init() {
    setupEventListeners();
    setupSvgInteractivity();
    updateTransitionExplorer();

    DOM.mobileInput.value = '9876543210';
    updateInputDiagnostics();
    renderDigitChips('9876543210');
    highlightStateNode('q0');

    console.log('Mobile Number Validator DFA Ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
