interface PollingOptions {
  /** 轮询任务，支持同步或异步函数 */
  task: () => void | Promise<void>;
  /** 间隔毫秒，默认 3000ms */
  interval?: number;
  /** 开始后是否立即执行一次任务，默认 true */
  immediate?: boolean;
  /** 创建时是否自动启动轮询，默认 false */
  autoStart?: boolean;
  /** 任务报错回调 */
  onError?: (error: unknown) => void;
}

export interface PollingController {
  /** 启动轮询（若已启动则忽略） */
  start: () => void;
  /** 停止轮询 */
  stop: () => void;
  /** 切换轮询状态，也可通过 force 指定状态 */
  toggle: (force?: boolean) => void;
  /** 立即执行任务一次，不影响定时器 */
  runOnce: () => Promise<void>;
  /** 当前是否正在轮询 */
  isRunning: () => boolean;
}

/**
 * 创建可控轮询
 */
export function createPollingController({
  task,
  interval = 3000,
  immediate = true,
  autoStart = false,
  onError
}: PollingOptions): PollingController {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let executing = false;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const scheduleNext = () => {
    if (!running) return;
    clearTimer();
    timer = setTimeout(() => {
      void executeTask();
    }, interval);
  };

  const executeTask = async (force = false) => {
    if (executing || (!running && !force)) return;
    // console.log(executing, "executing");
    // console.log(running, "running");
    // console.log(force, "force");
    executing = true;
    try {
      await task();
    } catch (err) {
      onError?.(err);
    } finally {
      executing = false;
      if (!force) {
        scheduleNext();
      }
    }
  };

  const start = () => {
    if (running) return;
    running = true;
    if (immediate) {
      void executeTask();
    } else {
      scheduleNext();
    }
  };

  const stop = () => {
    console.log("stop");
    running = false;
    clearTimer();
  };

  const toggle = (force?: boolean) => {
    const shouldStart = force ?? !running;
    if (shouldStart) start();
    else stop();
  };

  const runOnce = () => executeTask(true);

  if (autoStart) {
    start();
  }

  return {
    start,
    stop,
    toggle,
    runOnce,
    isRunning: () => running
  };
}
