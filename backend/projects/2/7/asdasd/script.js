// Простая и надёжная реализация TODO с localStorage
(() => {
    const STORAGE_KEY = 'my_todos_v1';

    // Элементы
    const input = document.getElementById('newTodo');
    const addBtn = document.getElementById('addBtn');
    const listEl = document.getElementById('todoList');
    const emptyState = document.getElementById('emptyState');
    const itemsLeft = document.getElementById('itemsLeft');
    const filterButtons = Array.from(document.querySelectorAll('.filter'));
    const clearCompletedBtn = document.getElementById('clearCompleted');

    let todos = [];
    let filter = 'all'; // all | active | completed

    // Загрузка из localStorage
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            todos = raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Ошибка парсинга localStorage', e);
            todos = [];
        }
    }

    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    }

    // Создать DOM-элемент задачи
    function createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.setAttribute('data-id', todo.id);
        li.setAttribute('role', 'listitem');

        // left (checkbox + text)
        const left = document.createElement('div');
        left.className = 'left';

        const checkbox = document.createElement('button');
        checkbox.className = 'checkbox' + (todo.completed ? ' completed' : '');
        checkbox.setAttribute('aria-pressed', String(!!todo.completed));
        checkbox.setAttribute('title', todo.completed ? 'Отметить как не выполнено' : 'Отметить как выполнено');
        checkbox.addEventListener('click', () => toggleComplete(todo.id));

        const text = document.createElement('div');
        text.className = 'todo-text' + (todo.completed ? ' completed' : '');
        text.textContent = todo.text;
        text.tabIndex = 0;
        text.setAttribute('role', 'button');
        text.setAttribute('aria-label', 'Задача: ' + todo.text + (todo.completed ? ' (выполнено)' : ''));

        // Редактирование при двойном клике или Enter
        text.addEventListener('dblclick', () => beginEdit(todo.id));
        text.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') beginEdit(todo.id);
        });

        left.appendChild(checkbox);
        left.appendChild(text);

        // actions
        const actions = document.createElement('div');
        actions.className = 'actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.title = 'Редактировать';
        editBtn.innerText = '✏️';
        editBtn.addEventListener('click', () => beginEdit(todo.id));

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn';
        delBtn.title = 'Удалить';
        delBtn.innerText = '🗑️';
        delBtn.addEventListener('click', () => removeTodo(todo.id));

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        li.appendChild(left);
        li.appendChild(actions);

        return li;
    }

    // Отрисовка списка согласно фильтру
    function render() {
        listEl.innerHTML = '';
        const filtered = todos.filter(t => {
            if (filter === 'all') return true;
            if (filter === 'active') return !t.completed;
            if (filter === 'completed') return t.completed;
        });

        if (filtered.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            const frag = document.createDocumentFragment();
            filtered.forEach(todo => frag.appendChild(createTodoElement(todo)));
            listEl.appendChild(frag);
        }

        updateFooter();
    }

    function updateFooter() {
        const leftCount = todos.filter(t => !t.completed).length;
        itemsLeft.textContent = `${leftCount} ${declOfNum(leftCount, ['задача', 'задачи', 'задач'])}`;
    }

    // Утилита для склонения слова
    function declOfNum(n, titles) {
        return titles[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2];
    }

    // Добавление
    function addTodo(text) {
        const trimmed = (text || '').trim();
        if (!trimmed) return;
        const todo = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            text: trimmed,
            completed: false,
            createdAt: Date.now()
        };
        todos.unshift(todo); // последние сверху
        save();
        render();
        input.value = '';
        input.focus();
    }

    // Удаление
    function removeTodo(id) {
        todos = todos.filter(t => t.id !== id);
        save();
        render();
    }

    // Переключить выполнение
    function toggleComplete(id) {
        todos = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        save();
        render();
    }

    // Начать редактирование (заменяем текст на input)
    function beginEdit(id) {
        const li = listEl.querySelector(`[data-id="${id}"]`);
        if (!li) return;
        const textEl = li.querySelector('.todo-text');
        const oldText = textEl.textContent;

        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.value = oldText;
        editInput.className = 'edit-input';
        editInput.style.width = '100%';
        editInput.style.padding = '6px 8px';
        editInput.style.borderRadius = '6px';
        editInput.style.border = '1px solid rgba(255,255,255,0.06)';
        editInput.style.background = 'transparent';
        editInput.style.color = 'inherit';
        textEl.replaceWith(editInput);
        editInput.focus();
        // сохранить или отменить
        const finish = () => {
            const newVal = editInput.value.trim();
            if (newVal) {
                todos = todos.map(t => t.id === id ? { ...t, text: newVal } : t);
                save();
            }
            render();
        };
        const cancel = () => render();

        editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') finish();
            if (e.key === 'Escape') cancel();
        });
        // клик вне
        editInput.addEventListener('blur', finish);
    }

    // Очистить все выполненные
    function clearCompleted() {
        todos = todos.filter(t => !t.completed);
        save();
        render();
    }

    // Установка фильтра UI + логика
    function setFilter(newFilter) {
        filter = newFilter;
        filterButtons.forEach(btn => {
            const is = btn.dataset.filter === newFilter;
            btn.classList.toggle('active', is);
            btn.setAttribute('aria-selected', is ? 'true' : 'false');
        });
        render();
    }

    // События
    addBtn.addEventListener('click', () => addTodo(input.value));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTodo(input.value);
    });

    filterButtons.forEach(b => {
        b.addEventListener('click', () => setFilter(b.dataset.filter));
    });

    clearCompletedBtn.addEventListener('click', clearCompleted);

    // Инициализация
    function init() {
        load();
        render();
    }

    // expose for debugging in console (optional)
    window.__todoApp = {
        getTodos: () => todos,
        addTodo,
        removeTodo,
        toggleComplete,
        setFilter
    };

    init();
})();
