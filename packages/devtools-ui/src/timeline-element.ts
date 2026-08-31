import type {
  DevtoolsApi,
  LoggedEvent,
  LogListener,
  StateSnapshot,
} from '@formjourney/plugin-devtools';

type Unsubscribe = ReturnType<DevtoolsApi['subscribeToLog']>;

const STYLES = `
  :host {
    all: initial;
    display: block;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    color: #e2e8f0;
    background: #0f172a;
    border-radius: 8px;
    overflow: hidden;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 560px) {
    .grid { grid-template-columns: 1fr; }
  }
  .col {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .col + .col {
    border-left: 1px solid #1e293b;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }
  .bar h2 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    flex: 1;
  }
  select, button {
    font: inherit;
    color: #e2e8f0;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 4px 8px;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .list, .state {
    max-height: 320px;
    overflow: auto;
    padding: 4px 0;
  }
  .empty {
    padding: 16px 12px;
    color: #64748b;
  }
  .row {
    padding: 6px 12px;
    border-bottom: 1px solid #1e293b;
    cursor: pointer;
  }
  .row:hover {
    background: #1e293b;
  }
  .row.selected {
    background: #1e3a5f;
  }
  .row-head {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .type {
    color: #38bdf8;
    font-weight: 600;
  }
  .ts {
    color: #64748b;
    margin-left: auto;
  }
  pre {
    margin: 4px 0 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: #cbd5e1;
  }
  .field {
    padding: 6px 12px;
    border-bottom: 1px solid #1e293b;
  }
  .field h3 {
    margin: 0 0 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #94a3b8;
  }
  .source {
    padding: 6px 12px;
    color: #64748b;
    border-bottom: 1px solid #1e293b;
  }
  .source .live {
    color: #4ade80;
  }
`;

const format = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export class FormJourneyDevtoolsTimeline extends HTMLElement {
  private root: ShadowRoot;
  private api: DevtoolsApi | null = null;
  private unsubscribe: Unsubscribe | null = null;
  private log: readonly LoggedEvent[] = [];
  private filter = '*';
  private selectedIndex: number | null = null;
  private listEl: HTMLDivElement | null = null;
  private selectEl: HTMLSelectElement | null = null;
  private stateEl: HTMLDivElement | null = null;
  private liveBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
  }

  disconnectedCallback(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  setApi(api: DevtoolsApi): void {
    this.unsubscribe?.();
    this.api = api;
    this.log = api.getEventLog();
    const onLog: LogListener = (log) => {
      this.log = log;
      if (this.selectedIndex !== null && this.selectedIndex >= log.length) {
        this.selectedIndex = null;
      }
      this.update();
    };
    this.unsubscribe = api.subscribeToLog(onLog);
    this.render();
  }

  private eventTypes(): readonly string[] {
    const types = new Set<string>();
    for (const entry of this.log) {
      types.add(entry.type);
    }
    return [...types].sort();
  }

  private visible(): readonly { entry: LoggedEvent; index: number }[] {
    const indexed = this.log.map((entry, index) => ({ entry, index }));
    if (this.filter === '*') {
      return indexed;
    }
    return indexed.filter(({ entry }) => entry.type === this.filter);
  }

  private shownSnapshot(): StateSnapshot | null {
    if (this.selectedIndex !== null) {
      return this.log[this.selectedIndex]?.snapshot ?? null;
    }
    return this.api?.getSnapshot() ?? null;
  }

  private render(): void {
    this.root.replaceChildren();

    const style = document.createElement('style');
    style.textContent = STYLES;

    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.append(this.renderTimelineColumn(), this.renderStateColumn());

    this.root.append(style, grid);
    this.update();
  }

  private renderTimelineColumn(): HTMLElement {
    const col = document.createElement('div');
    col.className = 'col';

    const bar = document.createElement('div');
    bar.className = 'bar';

    const heading = document.createElement('h2');
    heading.textContent = 'Event timeline';

    const select = document.createElement('select');
    select.addEventListener('change', () => {
      this.filter = select.value;
      this.update();
    });
    this.selectEl = select;

    const clear = document.createElement('button');
    clear.textContent = 'Clear';
    clear.addEventListener('click', () => {
      this.selectedIndex = null;
      this.api?.clearLog();
    });

    bar.append(heading, select, clear);

    const list = document.createElement('div');
    list.className = 'list';
    this.listEl = list;

    col.append(bar, list);
    return col;
  }

  private renderStateColumn(): HTMLElement {
    const col = document.createElement('div');
    col.className = 'col';

    const bar = document.createElement('div');
    bar.className = 'bar';

    const heading = document.createElement('h2');
    heading.textContent = 'Form state';

    const live = document.createElement('button');
    live.textContent = 'Live';
    live.addEventListener('click', () => {
      this.selectedIndex = null;
      this.update();
    });
    this.liveBtn = live;

    bar.append(heading, live);

    const state = document.createElement('div');
    state.className = 'state';
    this.stateEl = state;

    col.append(bar, state);
    return col;
  }

  private update(): void {
    this.syncFilterOptions();
    this.renderList();
    this.renderState();
  }

  private syncFilterOptions(): void {
    const select = this.selectEl;
    if (select === null) {
      return;
    }
    const wanted = ['*', ...this.eventTypes()];
    const current = [...select.options].map((option) => option.value);
    const same =
      wanted.length === current.length &&
      wanted.every((value, index) => value === current[index]);
    if (same) {
      select.value = this.filter;
      return;
    }
    select.replaceChildren();
    for (const value of wanted) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value === '*' ? 'all events' : value;
      select.append(option);
    }
    if (!wanted.includes(this.filter)) {
      this.filter = '*';
    }
    select.value = this.filter;
  }

  private renderList(): void {
    const list = this.listEl;
    if (list === null) {
      return;
    }
    list.replaceChildren();

    const rows = this.visible();
    if (rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No events yet.';
      list.append(empty);
      return;
    }

    for (const { entry, index } of rows) {
      const row = document.createElement('div');
      row.className = index === this.selectedIndex ? 'row selected' : 'row';
      row.addEventListener('click', () => {
        this.selectedIndex = index;
        this.update();
      });

      const head = document.createElement('div');
      head.className = 'row-head';

      const type = document.createElement('span');
      type.className = 'type';
      type.textContent = entry.type;

      const version = document.createElement('span');
      version.textContent = `v${String(entry.v)}`;

      const ts = document.createElement('span');
      ts.className = 'ts';
      ts.textContent = String(entry.timestamp);

      head.append(type, version, ts);

      const payload = document.createElement('pre');
      payload.textContent = format(entry.payload);

      row.append(head, payload);
      list.append(row);
    }
  }

  private renderState(): void {
    const state = this.stateEl;
    if (state === null) {
      return;
    }
    state.replaceChildren();

    if (this.liveBtn !== null) {
      this.liveBtn.disabled = this.selectedIndex === null;
    }

    const snapshot = this.shownSnapshot();

    const source = document.createElement('div');
    source.className = 'source';
    if (this.selectedIndex === null) {
      const live = document.createElement('span');
      live.className = 'live';
      live.textContent = '● live';
      source.append(live);
    } else {
      const entry = this.log[this.selectedIndex];
      source.textContent =
        entry === undefined
          ? 'snapshot'
          : `snapshot at #${String(this.selectedIndex)} — ${entry.type}`;
    }
    state.append(source);

    if (snapshot === null) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No state.';
      state.append(empty);
      return;
    }

    for (const key of ['values', 'errors', 'touched', 'dirty'] as const) {
      const field = document.createElement('div');
      field.className = 'field';

      const label = document.createElement('h3');
      label.textContent = key;

      const body = document.createElement('pre');
      body.textContent = format(snapshot[key]);

      field.append(label, body);
      state.append(field);
    }
  }
}
