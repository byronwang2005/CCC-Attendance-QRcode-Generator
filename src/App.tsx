import {
  type KeyboardEvent,
  type ReactNode,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState
} from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { AGENT_PROMPT, APP_PATHS, TEXT, TIME_LIMITS } from './config';
import {
  buildTimestamp,
  clearState,
  formatCurrentTime,
  formatDateTime,
  formatDateValue,
  getIdentityLabel,
  getTimeModeLabel,
  loadState,
  parseErrorMessage,
  persistState,
  sanitizeState,
  validateCourseUrl
} from './lib/wizard';
import type { Identity, ManualTime, QrResult, TimeMode, ToastState, WizardState } from './types';

const ReceiptStage = lazy(() => import('./features/qrcode/ReceiptStage').then((module) => ({
  default: module.ReceiptStage
})));

type StateAction =
  | { type: 'patch'; patch: StatePatch }
  | { type: 'reset' };

type StatePatch = Partial<Omit<WizardState, 'manualTime'>> & { manualTime?: Partial<ManualTime> };

type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'bot'
  | 'check'
  | 'copy'
  | 'rotate-ccw'
  | 'user'
  | 'x';

function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg className={`icon ${className}`} aria-hidden="true" focusable="false">
      <use href={`/assets/icons/actions.svg#${name}`} />
    </svg>
  );
}

const stateReducer = (state: WizardState, action: StateAction): WizardState => {
  if (action.type === 'reset') return sanitizeState({});
  return sanitizeState({
    ...state,
    ...action.patch,
    manualTime: action.patch.manualTime
      ? { ...state.manualTime, ...action.patch.manualTime }
      : state.manualTime
  });
};

const readCurrentStep = () => {
  const value = Number.parseInt(new URL(window.location.href).searchParams.get('step') ?? '1', 10);
  return value === 2 || value === 3 ? value : 1;
};

const navigate = (path: string, message?: string) => {
  const url = new URL(path, window.location.href);
  if (message) {
    url.searchParams.set('message', message);
    url.searchParams.set('type', 'error');
  }
  window.location.href = url.toString();
};

const redirect = (path: string, message?: string) => {
  const url = new URL(path, window.location.href);
  if (message) {
    url.searchParams.set('message', message);
    url.searchParams.set('type', 'error');
  }
  window.location.replace(url.toString());
};

const usePageMessage = (showToast: (message: string) => void) => {
  useEffect(() => {
    const url = new URL(window.location.href);
    const message = url.searchParams.get('message');
    if (!message) return;
    showToast(message);
    url.searchParams.delete('message');
    url.searchParams.delete('type');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }, [showToast]);
};

function BootLoader() {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(96, value + Math.max(2, Math.round((100 - value) / 6))));
    }, 55);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="boot-loader" aria-label="正在加载">
      <div className="boot-loader__panel">
        <img src="/assets/images/ccc-small.webp" alt="CCC" className="boot-loader__logo" />
        <p>正在准备</p>
        <div
          className="boot-loader__progress"
          role="progressbar"
          aria-label="加载进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <strong className="boot-loader__percent">{progress}%</strong>
      </div>
    </section>
  );
}

interface StepperProps {
  currentStep: number;
  onLocked: () => void;
}

const STEP_DATA = [
  { number: 1, title: '粘贴链接', description: '选择身份，并粘贴课程链接' },
  { number: 2, title: '确认时间', description: '选择模式，并确认时间' },
  { number: 3, title: '生成二维码', description: '查看结果' }
] as const;

function Stepper({ currentStep, onLocked }: StepperProps) {
  const activate = (target: number) => {
    if (target === currentStep) return;
    if (target < currentStep) navigate(APP_PATHS.step(target));
    else onLocked();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, target: number) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    activate(target);
  };

  return (
    <section className="stepper" aria-label="步骤进度">
      {STEP_DATA.map((step) => {
        const state = step.number === currentStep ? 'active' : (step.number < currentStep ? 'done' : 'idle');
        const description = step.number < currentStep ? '已完成' : step.description;
        return (
          <article
            key={step.number}
            className={`step-card is-${state} ${step.number < currentStep ? 'is-clickable-back' : ''} ${step.number > currentStep ? 'is-locked-step' : ''}`}
            data-step={step.number}
            aria-current={state === 'active' ? 'step' : undefined}
            aria-label={`跳转到第 ${step.number} 步`}
            role="button"
            tabIndex={0}
            onClick={() => activate(step.number)}
            onKeyDown={(event) => onKeyDown(event, step.number)}
          >
            <span className="step-number">{String(step.number).padStart(2, '0')}</span>
            <span className="step-copy">
              <strong>{step.title}</strong>
              <small>{description}</small>
            </span>
          </article>
        );
      })}
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <img src="/assets/images/ccc-small.webp" className="site-footer__logo" alt="CCC" />
      <p>
        本项目以
        <a href="https://github.com/byronwang2005/CCC-Attendance/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a>
        开源，源代码见
        <a href="https://github.com/byronwang2005/CCC-Attendance" target="_blank" rel="noopener noreferrer">GitHub Repository</a>
        。
      </p>
    </footer>
  );
}

function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (toast) closeRef.current?.focus();
  }, [toast]);

  if (!toast || toast.type === 'success') return null;
  return (
    <div className={`toast ${toast.type} show`} role="alertdialog" aria-live="assertive" aria-modal="true" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="toast__window">
        <div className="toast__header">
          <div className="toast__label">提示</div>
          <button ref={closeRef} type="button" className="toast__close" aria-label="关闭提示" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="toast__message">{toast.message}</div>
      </div>
    </div>
  );
}

function PageShell({
  currentStep,
  onLocked,
  children
}: {
  currentStep: number;
  onLocked: () => void;
  children: ReactNode;
}) {
  return (
    <div className="app-stage" data-step={currentStep}>
      <div className="page-shell">
        <header className="masthead" aria-label="站点抬头">
          <div className="masthead__copy">
            <h1 className="masthead__title">CCC Attendance</h1>
            <p className="masthead__summary">一个签到码，三步搞定</p>
          </div>
        </header>
        <div className="workflow-frame">
          <Stepper currentStep={currentStep} onLocked={onLocked} />
          <main className="wizard-layout">{children}</main>
        </div>
        <Footer />
      </div>
    </div>
  );
}

function IdentityStep({
  state,
  update,
  showToast
}: {
  state: WizardState;
  update: (patch: StatePatch) => void;
  showToast: (message: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectIdentity = (identity: Identity) => update({ identity });
  const copyAgentPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast(TEXT.errors.copyFailed);
    }
  };

  const goNext = () => {
    if (!state.identity) {
      showToast(TEXT.errors.chooseIdentityFirst);
      return;
    }
    if (state.identity !== 'human') return;
    const validation = validateCourseUrl(state.url);
    if (!validation.valid) {
      showToast(validation.message);
      inputRef.current?.focus();
      return;
    }
    update({ url: validation.normalizedUrl });
    persistState({ ...state, url: validation.normalizedUrl });
    navigate(APP_PATHS.time);
  };

  return (
    <>
      <section className="panel identity-panel">
        <div className="identity-header">
          <h3>先告诉我，您是？</h3>
          <div className="identity-buttons" role="tablist" aria-label="身份选择">
            <button
              type="button"
              className={`identity-btn ${state.identity === 'human' ? 'active' : ''}`}
              onClick={() => selectIdentity('human')}
            >
              <Icon name="user" />
              <span>人类</span>
            </button>
            <button
              type="button"
              className={`identity-btn ${state.identity === 'agent' ? 'active' : ''}`}
              onClick={() => selectIdentity('agent')}
            >
              <Icon name="bot" />
              <span>AI代理</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {state.identity === 'human' && (
            <motion.div
              key="human"
              className="identity-content"
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            >
              <div className="guide-list" role="list" aria-label="人工签到指引">
                <Guide index="01" title="卡准时间">
                  最佳签到时间窗口是课程结束前10分钟到课程结束时刻，例如20:00下课时，可优先考虑19:50到20:00。
                </Guide>
                <Guide index="02" title="连接网络">
                  网络环境需处于<code>eduroam</code>、<code>UNNC-Living</code>或<code>UNNC_IPSec VPN</code>等校园网络之一。
                </Guide>
                <Guide index="03" title="复制链接">
                  用手机浏览器（如Safari）打开
                  <a href="https://ccc.nottingham.edu.cn/study/" target="_blank" rel="noopener noreferrer">CCC课程页面</a>
                  ，不要用微信内置浏览器。找到要签到的课程，长按“查看详情”，选择“复制链接”。
                </Guide>
                <Guide
                  index="04"
                  title="粘贴链接"
                  extra={(
                    <div className="course-link-input-wrap">
                      <input
                        ref={inputRef}
                        id="urlInput"
                        type="text"
                        inputMode="url"
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="https://ccc.nottingham.edu.cn/study/home/details?id="
                        aria-label="课程详情链接输入框"
                        value={state.url}
                        onChange={(event) => update({ url: event.target.value.trim() })}
                      />
                    </div>
                  )}
                >
                  链接格式类似 <code>https://ccc.nottingham.edu.cn/study/home/details?id=xxxx</code>。把完整链接粘贴到下方输入框。
                </Guide>
              </div>
            </motion.div>
          )}
          {state.identity === 'agent' && (
            <motion.div
              key="agent"
              className="identity-content agent-content"
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            >
              <div className="agent-command">
                <span className="agent-text">{AGENT_PROMPT}</span>
                <button type="button" className="copy-btn" disabled={copied} onClick={copyAgentPrompt}>
                  <Icon name={copied ? 'check' : 'copy'} />
                  <span>{copied ? '已复制!' : '复制'}</span>
                </button>
              </div>
              <p className="agent-hint">把这句话交给AI代理，它会引导您在本地完成后续步骤。</p>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <div className="actions actions-major">
        <button
          type="button"
          className="button-primary"
          disabled={state.identity !== 'human' || !state.url.trim()}
          aria-disabled={state.identity !== 'human' || !state.url.trim()}
          onClick={goNext}
        >
          <span>下一步</span>
          <Icon name="arrow-right" />
        </button>
      </div>
    </>
  );
}

function Guide({
  index,
  title,
  children,
  extra
}: {
  index: string;
  title: string;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <article className="guide-card" role="listitem">
      <div className="guide-card-index">{index}</div>
      <div className="guide-card-body">
        <h3>{title}</h3>
        <p>{children}</p>
        {extra}
      </div>
    </article>
  );
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function createSelectableWindow() {
  const windowStart = new Date();
  const windowEnd = new Date(windowStart.getTime() + TIME_LIMITS.manualWindowMs);
  if (windowStart.getSeconds() > 0 || windowStart.getMilliseconds() > 0) {
    windowStart.setMinutes(windowStart.getMinutes() + 1, 0, 0);
  }
  windowEnd.setSeconds(0, 0);
  return { windowStart, windowEnd };
}

function TimeStep({
  state,
  update,
  showToast
}: {
  state: WizardState;
  update: (patch: StatePatch) => void;
  showToast: (message: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(new Date());
  const windowRange = useMemo(createSelectableWindow, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dateOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    const cursor = new Date(windowRange.windowStart.getFullYear(), windowRange.windowStart.getMonth(), windowRange.windowStart.getDate());
    const end = formatDateValue(windowRange.windowEnd);
    while (formatDateValue(cursor) <= end) {
      const value = formatDateValue(cursor);
      let label = `${value} ${WEEKDAY_LABELS[cursor.getDay()]}`;
      if (value === formatDateValue(windowRange.windowStart)) label += '（今天）';
      else {
        const tomorrow = new Date(windowRange.windowStart);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (value === formatDateValue(tomorrow)) label += '（明天）';
      }
      options.push({ value, label });
      cursor.setDate(cursor.getDate() + 1);
    }
    return options;
  }, [windowRange]);

  const bounds = useMemo(() => {
    const dayStart = new Date(`${state.manualTime.date}T00:00:00`);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    return {
      min: new Date(Math.max(dayStart.getTime(), windowRange.windowStart.getTime())),
      max: new Date(Math.min(dayEnd.getTime(), windowRange.windowEnd.getTime()))
    };
  }, [state.manualTime.date, windowRange]);

  const hourOptions = Array.from({ length: Math.max(0, bounds.max.getHours() - bounds.min.getHours() + 1) }, (_, index) => bounds.min.getHours() + index);
  const selectedHour = Math.min(Math.max(Number.parseInt(state.manualTime.hour, 10) || bounds.min.getHours(), bounds.min.getHours()), bounds.max.getHours());
  const minMinute = selectedHour === bounds.min.getHours() ? bounds.min.getMinutes() : 0;
  const maxMinute = selectedHour === bounds.max.getHours() ? bounds.max.getMinutes() : 59;
  const selectedMinute = Math.min(
    Math.max(Number.parseInt(state.manualTime.minute, 10) || minMinute, minMinute),
    maxMinute
  );
  const minuteOptions = Array.from({ length: Math.max(0, maxMinute - minMinute + 1) }, (_, index) => minMinute + index);

  const updateManual = (patch: Partial<ManualTime>) => {
    const next = { ...state.manualTime, ...patch };
    if (patch.date) {
      const start = patch.date === formatDateValue(windowRange.windowStart) ? windowRange.windowStart : new Date(`${patch.date}T00:00:00`);
      next.hour = String(start.getHours());
      next.minute = String(start.getMinutes());
    } else if (patch.hour) {
      const hour = Number.parseInt(patch.hour, 10);
      const min = hour === bounds.min.getHours() ? bounds.min.getMinutes() : 0;
      const max = hour === bounds.max.getHours() ? bounds.max.getMinutes() : 59;
      next.minute = String(Math.min(Math.max(Number.parseInt(next.minute, 10) || 0, min), max));
    }
    update({ manualTime: next });
  };

  const setMode = (timeMode: TimeMode) => update(timeMode === 'manual'
    ? {
      timeMode,
      manualTime: {
        date: state.manualTime.date,
        hour: String(selectedHour),
        minute: String(selectedMinute)
      }
    }
    : { timeMode });
  const goNext = () => {
    try {
      buildTimestamp(state);
      persistState(state);
      navigate(APP_PATHS.qrcode);
    } catch (error) {
      showToast(error instanceof Error ? error.message : TEXT.errors.invalidManualTime);
      if (state.timeMode === 'manual') document.getElementById('date')?.focus();
    }
  };

  return (
    <>
      <section className="panel time-panel">
        <div className="panel-header">
          <h3>选择时间模式</h3>
          <p className="panel-current-time">当前时间 {formatCurrentTime(now)}</p>
        </div>
        <div className="radio-grid" role="radiogroup" aria-label="时间模式选择">
          <ChoiceCard selected={state.timeMode === 'auto'} value="auto" onSelect={setMode}>
            <strong>自动（推荐）</strong>
            <small>适合绝大多数情况。</small>
          </ChoiceCard>
          <ChoiceCard selected={state.timeMode === 'manual'} value="manual" onSelect={setMode}>
            <strong>手动</strong>
            <small>自定义签到时间，通常用于提前准备二维码。</small>
          </ChoiceCard>
        </div>
        <AnimatePresence initial={false}>
          {state.timeMode === 'manual' && (
            <motion.div
              id="manualTime"
              className="time-grid-shell"
              initial={reduceMotion ? false : { opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0, y: -6 }}
            >
              <div className="time-grid">
                <div>
                  <label htmlFor="date">日期</label>
                  <select id="date" value={state.manualTime.date} onChange={(event) => updateManual({ date: event.target.value })}>
                    {dateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="hour">时</label>
                  <select id="hour" value={String(selectedHour)} onChange={(event) => updateManual({ hour: event.target.value })}>
                    {hourOptions.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="minute">分</label>
                  <select id="minute" value={String(selectedMinute)} onChange={(event) => updateManual({ minute: event.target.value })}>
                    {minuteOptions.map((minute) => <option key={minute} value={minute}>{String(minute).padStart(2, '0')}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      <div className="actions">
        <button type="button" className="button-secondary" onClick={() => {
          persistState(state);
          navigate(APP_PATHS.index);
        }}>
          <Icon name="arrow-left" />
          <span>返回上一步</span>
        </button>
        <button type="button" className="button-primary" onClick={goNext}>
          <span>下一步</span>
          <Icon name="arrow-right" />
        </button>
      </div>
    </>
  );
}

function ChoiceCard({
  selected,
  value,
  onSelect,
  children
}: {
  selected: boolean;
  value: TimeMode;
  onSelect: (value: TimeMode) => void;
  children: ReactNode;
}) {
  return (
    <label className={`choice-card ${selected ? 'is-selected' : ''}`}>
      <input type="radio" name="mode" value={value} checked={selected} onChange={() => onSelect(value)} />
      <span>{children}</span>
    </label>
  );
}

function QrcodeStep({
  state,
  showToast
}: {
  state: WizardState;
  showToast: (message: string) => void;
}) {
  const [result, setResult] = useState<QrResult>({});
  const validation = useMemo(() => validateCourseUrl(state.url), [state.url]);

  useEffect(() => {
    if (!validation.valid) return;
    let active = true;
    let objectUrl = '';

    const generate = async () => {
      let timestamp: number;
      try {
        timestamp = buildTimestamp(state);
      } catch (error) {
        redirect(APP_PATHS.time, error instanceof Error ? error.message : TEXT.errors.invalidManualTime);
        return;
      }

      try {
        const response = await fetch(APP_PATHS.generateApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: validation.normalizedUrl, timestamp })
        });
        if (!response.ok) throw new Error(parseErrorMessage(await response.text()));
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setResult({ imageUrl: objectUrl, generatedTime: formatDateTime(timestamp) });
      } catch (error) {
        const message = error instanceof Error && error.message === 'Failed to fetch'
          ? TEXT.errors.networkError
          : (error instanceof Error ? error.message : TEXT.errors.qrCodeGenerationFallback);
        if (active) {
          setResult({ message });
          showToast(`二维码生成失败：${message}`);
        }
      }
    };

    void generate();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [state, validation, showToast]);

  return (
    <>
      <section className="receipt-panel panel">
        <div id="qrcode" className="qrcode-stage" aria-label="二维码，就位">
          {result.imageUrl && validation.valid ? (
            <Suspense fallback={<div className="qrcode-placeholder"><div>{TEXT.placeholders.qrCodeLoading}</div></div>}>
              <ReceiptStage
                imageUrl={result.imageUrl}
                generatedTime={result.generatedTime ?? ''}
                identityLabel={getIdentityLabel(state.identity)}
                modeLabel={getTimeModeLabel(state)}
                scheduleId={validation.scheduleId}
              />
            </Suspense>
          ) : (
            <div className="qrcode-placeholder">
              <div>{result.message ? TEXT.errors.qrCodeGenerationFailed : TEXT.placeholders.qrCodeLoading}</div>
            </div>
          )}
        </div>
      </section>
      <div className="actions">
        <button type="button" className="button-secondary" onClick={() => navigate(APP_PATHS.time)}>
          <Icon name="arrow-left" />
          <span>返回上一步</span>
        </button>
        <button type="button" className="button-secondary" onClick={() => {
          clearState();
          navigate(APP_PATHS.index);
        }}>
          <Icon name="rotate-ccw" />
          <span>生成更多</span>
        </button>
      </div>
    </>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [state, dispatch] = useReducer(stateReducer, undefined, loadState);
  const [toast, setToast] = useState<ToastState | null>(null);
  const currentStep = readCurrentStep();
  const showToast = useCallback((message: string) => setToast({ message, type: 'error' }), []);

  usePageMessage(showToast);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    const image = new Image();
    image.src = '/assets/images/ccc-small.webp';
    const fonts = document.fonts?.ready ?? Promise.resolve();
    const delay = new Promise((resolve) => window.setTimeout(resolve, 520));
    void Promise.allSettled([fonts, image.decode?.() ?? Promise.resolve(), delay]).then(() => setReady(true));
  }, []);

  useEffect(() => {
    const canonical = APP_PATHS.step(currentStep);
    const current = `${window.location.pathname}${window.location.search}`;
    if ((window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/index.html')) && !current.includes('message=')) {
      window.history.replaceState({}, '', canonical);
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 1) return;
    const validation = validateCourseUrl(state.url);
    if (!state.url) {
      redirect(APP_PATHS.index, currentStep === 2 ? TEXT.redirects.finishFirstStep : TEXT.redirects.finishPreviousSteps);
    } else if (!validation.valid) {
      redirect(APP_PATHS.index, validation.message);
    }
  }, [currentStep, state.url]);

  const update = (patch: StatePatch) => dispatch({ type: 'patch', patch });

  if (!ready) return <BootLoader />;

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}>
      <PageShell currentStep={currentStep} onLocked={() => showToast(TEXT.errors.completeCurrentStepFirst)}>
        {currentStep === 1 && <IdentityStep state={state} update={update} showToast={showToast} />}
        {currentStep === 2 && <TimeStep state={state} update={update} showToast={showToast} />}
        {currentStep === 3 && <QrcodeStep state={state} showToast={showToast} />}
      </PageShell>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </MotionConfig>
  );
}
