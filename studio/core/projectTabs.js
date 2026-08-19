const SESSION_VERSION = 1;

function makeId() {
  return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function fingerprint(project) {
  try { return JSON.stringify(project); } catch (_) { return ""; }
}

export function createProjectTabs({
  container,
  initialProject,
  storage = globalThis.localStorage,
  storageKey = "amy_studio_project_tabs_v1",
  migrateProject = (project) => project,
  confirmClose = (message) => globalThis.confirm?.(message) !== false,
  onBeforeActivate = () => ({}),
  captureTransientState = () => ({}),
  onActivate = () => {}
}) {
  let tabs = [];
  let activeId = "";

  function load() {
    try {
      const saved = JSON.parse(storage?.getItem(storageKey) || "null");
      if (saved?.version === SESSION_VERSION && Array.isArray(saved.tabs) && saved.tabs.length) {
        tabs = saved.tabs
          .filter((tab) => tab?.project && typeof tab.project === "object")
          .map((tab) => ({
            id: String(tab.id || makeId()),
            project: migrateProject(tab.project),
            cleanFingerprint: String(tab.cleanFingerprint || ""),
            viewState: tab.viewState && typeof tab.viewState === "object" ? tab.viewState : {}
          }));
        activeId = tabs.some((tab) => tab.id === saved.activeId) ? saved.activeId : tabs[0]?.id;
      }
    } catch (_) {}
    if (!tabs.length) {
      const project = initialProject;
      tabs = [{ id: makeId(), project, cleanFingerprint: fingerprint(project), viewState: {} }];
      activeId = tabs[0].id;
    }
  }

  function activeTab() {
    return tabs.find((tab) => tab.id === activeId) || tabs[0];
  }

  function isDirty(tab) {
    return fingerprint(tab.project) !== tab.cleanFingerprint;
  }

  function persist() {
    try {
      const savedTabs = tabs.map(({ transientState, ...tab }) => tab);
      storage?.setItem(storageKey, JSON.stringify({ version: SESSION_VERSION, activeId, tabs: savedTabs }));
    } catch (_) {
      // The legacy active-project save remains available if browser storage is full.
    }
  }

  function render() {
    if (!container) return;
    container.textContent = "";
    for (const tab of tabs) {
      const item = document.createElement("div");
      item.className = `project-tab${tab.id === activeId ? " project-tab--active" : ""}`;
      item.dataset.projectTabId = tab.id;

      const activate = document.createElement("button");
      activate.type = "button";
      activate.className = "project-tab__activate";
      activate.title = tab.project.projectName || "Untitled project";
      activate.setAttribute("aria-label", `Open ${tab.project.projectName || "Untitled project"}`);
      activate.textContent = `${isDirty(tab) ? "● " : ""}${tab.project.projectName || "Untitled"}`;
      activate.addEventListener("click", () => activateTab(tab.id));

      const close = document.createElement("button");
      close.type = "button";
      close.className = "project-tab__close";
      close.title = `Close ${tab.project.projectName || "project"}`;
      close.setAttribute("aria-label", close.title);
      close.textContent = "×";
      close.addEventListener("click", () => closeTab(tab.id));
      item.addEventListener("auxclick", (event) => {
        if (event.button === 1) closeTab(tab.id);
      });

      item.append(activate, close);
      container.appendChild(item);
    }
  }

  function activateTab(id) {
    if (id === activeId || !tabs.some((tab) => tab.id === id)) return;
    activeTab().viewState = onBeforeActivate(activeTab().project) || {};
    activeTab().transientState = captureTransientState(activeTab().project) || {};
    activeId = id;
    persist();
    render();
    onActivate(activeTab().project, activeTab().viewState, activeTab().transientState || {});
  }

  function openProject(project, { clean = true } = {}) {
    activeTab().viewState = onBeforeActivate(activeTab().project) || {};
    activeTab().transientState = captureTransientState(activeTab().project) || {};
    const tab = {
      id: makeId(),
      project,
      cleanFingerprint: clean ? fingerprint(project) : "",
      viewState: {},
      transientState: {}
    };
    tabs.push(tab);
    activeId = tab.id;
    persist();
    render();
    onActivate(project, tab.viewState, tab.transientState);
    return tab.id;
  }

  function closeTab(id) {
    const index = tabs.findIndex((tab) => tab.id === id);
    if (index < 0) return false;
    const tab = tabs[index];
    if (isDirty(tab) && !confirmClose(`Close “${tab.project.projectName || "Untitled"}” and discard its session changes?`)) {
      return false;
    }
    tabs.splice(index, 1);
    if (!tabs.length) {
      const project = initialProject;
      tabs.push({ id: makeId(), project, cleanFingerprint: fingerprint(project), viewState: {} });
    }
    if (activeId === id) {
      activeId = tabs[Math.min(index, tabs.length - 1)].id;
      onActivate(activeTab().project, activeTab().viewState, activeTab().transientState || {});
    }
    persist();
    render();
    return true;
  }

  function projectChanged() {
    persist();
    render();
  }

  function markActiveClean() {
    const tab = activeTab();
    tab.cleanFingerprint = fingerprint(tab.project);
    persist();
    render();
  }

  load();
  render();
  return {
    getActiveProject: () => activeTab().project,
    openProject,
    activateTab,
    closeTab,
    projectChanged,
    markActiveClean,
    render,
    getState: () => ({ activeId, tabs })
  };
}
