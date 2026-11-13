export const PAGE_SIZE = 5;

export function renderPagination(root, page, total, onChange, label = "itens") {
  const pages = Math.ceil(total / PAGE_SIZE);
  root.replaceChildren();
  if (!total) return;
  const status = document.createElement("p");
  status.className = "pagination-status";
  status.textContent = `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total} ${label}`;
  root.append(status);
  if (pages <= 1) return;
  const controls = document.createElement("div");
  controls.className = "pagination-controls";
  const addButton = (text, target, ariaLabel) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "page-button";
    button.textContent = text;
    button.setAttribute("aria-label", ariaLabel);
    button.disabled = target < 1 || target > pages;
    if (target === page && /^\d+$/.test(text)) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => {
      onChange(target);
      root.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
    });
    controls.append(button);
  };
  addButton("‹", page - 1, "Página anterior");
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let number = start; number <= Math.min(pages, start + 4); number += 1) {
    addButton(String(number), number, `Página ${number}`);
  }
  addButton("›", page + 1, "Próxima página");
  root.append(controls);
}

export function attachCharacterCounter(input) {
  if (!input || input.maxLength < 1) return;
  const counter = document.createElement("small");
  counter.className = "character-counter";
  counter.id = `${input.id}-counter`;
  input.insertAdjacentElement("afterend", counter);
  input.setAttribute("aria-describedby", [input.getAttribute("aria-describedby"), counter.id].filter(Boolean).join(" "));
  const update = () => { counter.textContent = `${input.value.length.toLocaleString("pt-BR")} / ${input.maxLength.toLocaleString("pt-BR")} caracteres`; };
  input.addEventListener("input", update);
  input.form?.addEventListener("reset", () => queueMicrotask(update));
  update();
}
