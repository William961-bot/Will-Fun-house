(() => {
  const desktop = document.getElementById('desktop');
  const windowTpl = document.getElementById('window-tpl');
  const taskItems = document.getElementById('task-items');
  const clock = document.getElementById('clock');

  let windows = [];
  let activeWindow = null;
  let zIndex = 100;

  function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --- Dragging icons ---
  let dragIcon = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  desktop.addEventListener('mousedown', (e) => {
    const icon = e.target.closest('.icon');
    if (!icon) return;

    // select icon
    document.querySelectorAll('.icon').forEach(i => i.classList.remove('selected'));
    icon.classList.add('selected');

    dragIcon = icon;
    dragOffsetX = e.clientX - icon.offsetLeft;
    dragOffsetY = e.clientY - icon.offsetTop;
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragIcon) return;
    dragIcon.style.left = (e.clientX - dragOffsetX) + 'px';
    dragIcon.style.top = (e.clientY - dragOffsetY) + 'px';
  });

  window.addEventListener('mouseup', () => {
    dragIcon = null;
  });

  // --- Double click opens window ---
  desktop.addEventListener('dblclick', (e) => {
    const icon = e.target.closest('.icon');
    if (!icon) return;
    const title = icon.getAttribute('data-title') || 'Window';
    openWindow(title, `<b>${title}</b><br>This is a placeholder window.`);
  });

  function openWindow(title, bodyHtml) {
    const win = windowTpl.cloneNode(true);
    win.id = '';
    win.style.display = 'flex';
    win.style.left = (60 + windows.length * 30) + 'px';
    win.style.top = (40 + windows.length * 30) + 'px';
    win.style.zIndex = ++zIndex;

    win.querySelector('.title-text').textContent = title;
    win.querySelector('.window-body').innerHTML = bodyHtml;

    // dragging window
    const bar = win.querySelector('.title-bar');
    let wdx = 0, wdy = 0, dragging = false;
    bar.addEventListener('mousedown', (e) => {
      dragging = true;
      wdx = e.clientX - win.offsetLeft;
      wdy = e.clientY - win.offsetTop;
      focusWindow(win);
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      win.style.left = (e.clientX - wdx) + 'px';
      win.style.top = (e.clientY - wdy) + 'px';
    });
    window.addEventListener('mouseup', () => { dragging = false; });

    // close / minimize / maximize placeholders
    win.querySelector('.close').addEventListener('click', () => {
      win.remove();
      const ti = document.querySelector('.task-item[data-id="' + win.dataset.id + '"]');
      if (ti) ti.remove();
      windows = windows.filter(w => w !== win);
    });

    // taskbar entry
    const id = 'win-' + Date.now();
    win.dataset.id = id;
    const ti = document.createElement('div');
    ti.className = 'task-item';
    ti.dataset.id = id;
    ti.textContent = title;
    ti.addEventListener('click', () => focusWindow(win));
    taskItems.appendChild(ti);

    focusWindow(win);
    desktop.appendChild(win);
    windows.push(win);
  }

  function focusWindow(win) {
    activeWindow = win;
    win.style.zIndex = ++zIndex;
    document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
    win.classList.add('active');
    document.querySelectorAll('.task-item').forEach(t => t.classList.remove('active'));
    const ti = document.querySelector('.task-item[data-id="' + win.dataset.id + '"]');
    if (ti) ti.classList.add('active');
  }

  // Click empty desktop to deselect icons
  desktop.addEventListener('mousedown', (e) => {
    if (e.target === desktop) {
      document.querySelectorAll('.icon').forEach(i => i.classList.remove('selected'));
    }
  });

  // TODO: right-click desktop context menu
  // TODO: start-btn open/close start menu
  // TODO: minimize / maximize / restore buttons
  // TODO: taskbar minimize/restore behavior
})();
