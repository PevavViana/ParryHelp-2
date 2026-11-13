import { PAGE_SIZE, renderPagination, attachCharacterCounter } from "./ui-helpers.js";

(() => {
  const shell = document.querySelector("[data-product-shell]");
  const id = Number(new URLSearchParams(location.search).get("id"));
  let product;
  let reviews = [];
  let authors = {};
  let reviewPage = 1;
  const escape = ParryHelp.escapeHTML;
  const dateToISO = (value) => {
    const match = String(value || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
  };
  const dateToAPI = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
  };
  const todayISO = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };
  const categoryFor = (categories) =>
    categories.find((item) => Number(item.id) === Number(product.categoria_id))
      ?.nome || "Sem categoria";
  function render(category) {
    const user = ParryHelp.getUsuarioLogado();
    const isCreator = user && Number(product.criado_por_id) === Number(user.id);
    const ownReview = reviews.find((item) => Number(item.usuario_id) === Number(user?.id));
    const average = Number(product.media_notas || 0);
    document.title = `${product.nome} — Parry Help`;
    shell.innerHTML = `<p class="detail-topline">
        <a href="catalogo.html">← Voltar ao catálogo</a>
        </p>
        <div class="detail-layout">
        <section class="detail-hero">
        <div class="detail-visual">${product.imagem_url && /^https?:\/\//i.test(product.imagem_url) ? `<img src="${escape(product.imagem_url)}" alt="${escape(product.nome)}" onerror="this.remove()">` : escape(product.nome.charAt(0))}</div>
        <div class="detail-copy">
        <p class="eyebrow">${escape(category)}</p>
        <h1>${escape(product.nome)}</h1>
        <div class="detail-rating">
        <strong>${average.toFixed(1)}</strong>
        <span>/ 10 · nota da comunidade</span>
        </div>
        <p>${escape(product.descricao)}</p>
        <div class="detail-actions">
        <button class="button button-primary" type="button" data-review-action ${isCreator ? 'disabled title="Você não pode avaliar um produto que cadastrou."' : ""}>${isCreator ? "Produto cadastrado por você" : user ? (ownReview ? "Editar minha avaliação" : "Escrever avaliação") : "Entre para avaliar"} <span aria-hidden="true">↗</span>
        </button>
        <button class="button button-quiet" type="button" data-compare-add>Adicionar à comparação</button>
        </div>
        </div>
        </section>
        <aside class="detail-aside">
        <h2>Ficha rápida</h2>
        <dl>
        <div>
        <dt>Categoria</dt>
        <dd>${escape(category)}</dd>
        </div>
        <div>
        <dt>Nota geral</dt>
        <dd>${average.toFixed(1)} / 10</dd>
        </div>
        <div>
        <dt>Avaliações</dt>
        <dd>${reviews.length}</dd>
        </div>
        <div>
        <dt>Identificador</dt>
        <dd>#${Number(product.id)}</dd>
        </div>
        </dl>
        </aside>
        </div>
        <section class="ai-panel">
        <div>
        <p class="eyebrow">Leitura assistida</p>
        <h2>O que as avaliações contam?</h2>
        <p data-ai-review>Um resumo dos pontos recorrentes nas avaliações deste produto.</p>
        </div>
        <button class="button" type="button" data-ai-review-button>Gerar resumo ↗</button>
        </section>
        <section class="reviews-section" id="avaliacoes">
        <div class="reviews-header">
        <h2>Experiências da comunidade <span class="review-count-badge" aria-label="${reviews.length} avaliações">${reviews.length}</span></h2>
        </div>
        <div data-review-form-area>
        </div>
        <div class="reviews-list" data-reviews aria-live="polite"></div>
        <nav class="pagination" data-review-pagination aria-label="Páginas de avaliações"></nav>
        </section>
        `;
    shell
      .querySelector("[data-ai-review-button]")
      .addEventListener("click", generateSummary);
    shell
      .querySelector("[data-review-action]")
      .addEventListener("click", () => {
        if (!ParryHelp.getUsuarioLogado()) {
          ParryHelp.openAuth("login");
          return;
        }
        reviewForm();
      });
    shell.querySelector("[data-compare-add]").addEventListener("click", () => {
      let ids;
      try {
        ids = JSON.parse(sessionStorage.getItem("taxatio_compare") || "[]");
      } catch {
        ids = [];
      }
      if (!ids.includes(Number(product.id)) && ids.length >= 3) {
        ParryHelp.showToast("A comparação já tem três produtos.", true);
        return;
      }
      sessionStorage.setItem(
        "taxatio_compare",
        JSON.stringify([...new Set([...ids, Number(product.id)])]),
      );
      location.href = "comparar.html";
    });
    renderReviewPage();
  }
  function renderReviewPage() {
    reviewPage = Math.max(1, Math.min(reviewPage, Math.ceil(reviews.length / PAGE_SIZE)));
    shell.querySelector("[data-reviews]").innerHTML = renderReviews(ParryHelp.getUsuarioLogado());
    renderPagination(shell.querySelector("[data-review-pagination]"), reviewPage, reviews.length, (page) => {
      reviewPage = page;
      renderReviewPage();
      shell.querySelector(".reviews-header").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }, "avaliações");
  }
  function renderReviews(user) {
    const sorted = [...reviews].sort(
      (a, b) =>
        Number(Number(b.usuario_id) === Number(user?.id)) - Number(Number(a.usuario_id) === Number(user?.id)) ||
        String(dateToISO(b.data) || b.data).localeCompare(String(dateToISO(a.data) || a.data)),
    );
    if (!sorted.length)
      return `<div class="empty-state">
        <span class="empty-mark">✳</span>
        <h2>Primeira avaliação em aberto.</h2>
        <p>Você pode ser a primeira pessoa a compartilhar uma experiência com este produto.</p>
        </div>`;
    return sorted
      .slice((reviewPage - 1) * PAGE_SIZE, reviewPage * PAGE_SIZE)
      .map((review) => {
        const own = user && Number(user.id) === Number(review.usuario_id);
        const isoDate = dateToISO(review.data) || (/^\d{4}-\d{2}-\d{2}$/.test(review.data) ? review.data : "");
        const displayDate = isoDate ? isoDate.split("-").reverse().join("/") : review.data;
        return `<article class="review-item">
        <div class="review-head">
        <div class="review-author"><span class="review-avatar" aria-hidden="true">${escape((own ? user.nome : "Comunidade").charAt(0))}</span><div><strong>${escape(authors[review.usuario_id] || (own ? user.nome : "Membro da comunidade"))}</strong>${own ? '<span class="review-own-label">Sua avaliação</span>' : '<span class="review-own-label">Experiência compartilhada</span>'}</div></div>
        <span class="review-meta">
          <span class="review-score" aria-label="Nota ${Number(review.nota).toFixed(1)} de 10">${Number(review.nota).toFixed(1).replace(".", ",")} <small>/ 10</small></span>
          <time class="review-date" ${isoDate ? `datetime="${escape(isoDate)}"` : ""}>${escape(displayDate)}</time>
        </span>
        </div>
        <h3>${escape(review.titulo)}</h3>
        <p>${escape(review.descricao)}</p>${own ? `<div class="review-actions"><button class="quiet-button" data-review-edit="${Number(review.id)}">Editar</button><button class="quiet-button" data-review-delete="${Number(review.id)}">Excluir</button></div>` : ""}</article>`;
      })
      .join("");
  }
  function reviewForm(review = null) {
    if (Number(product.criado_por_id) === Number(ParryHelp.getUsuarioLogado()?.id)) {
      ParryHelp.showToast("Você não pode avaliar um produto que cadastrou.", true);
      return;
    }
    review ||= reviews.find((item) => Number(item.usuario_id) === Number(ParryHelp.getUsuarioLogado()?.id)) || null;
    const area = shell.querySelector("[data-review-form-area]");
    const reviewDateMessage = review
      ? "A data original desta avaliação será mantida."
      : `Sua avaliação será registrada com a data de hoje (${new Intl.DateTimeFormat("pt-BR").format(new Date())}).`;
    area.innerHTML = `<form class="review-form" data-review-form novalidate>
        <div class="field-wrap wide">
        <label for="review-title">Título</label>
        <input id="review-title" name="titulo" required maxlength="100" value="${escape(review?.titulo || "")}">
        <span class="field-error" data-error="titulo">
        </span>
        </div>
        <div class="field-wrap wide">
        <label for="review-description">Sua experiência</label>
        <textarea id="review-description" name="descricao" required maxlength="220">${escape(review?.descricao || "")}</textarea>
        <span class="field-error" data-error="descricao">
        </span>
        </div>
        <div class="field-wrap wide">
        <label for="review-rating">Nota de 0 a 10</label>
        <input id="review-rating" name="nota" type="number" inputmode="decimal" min="0" max="10" step="0.1" required value="${review ? Number(review.nota) : ""}">
        <span class="field-error" data-error="nota">
        </span>
        </div>
        <div class="review-date-note wide" role="note">
        <span class="review-date-dot" aria-hidden="true"></span>
        <span>${reviewDateMessage}</span>
        </div>
        <p class="form-error wide" data-review-error role="alert">
        </p>
        <button class="button button-primary" type="submit">${review ? "Salvar alterações" : "Publicar avaliação"} ↗</button>
        <button class="quiet-button" type="button" data-review-cancel>Cancelar</button>
        </form>`;
    attachCharacterCounter(area.querySelector("#review-description"));
    area.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    area.querySelector("#review-title").focus({ preventScroll: true });
    area
      .querySelector("[data-review-cancel]")
      .addEventListener("click", () => area.replaceChildren());
    area.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const number = data.nota.trim() === "" ? Number.NaN : Number(data.nota);
      const errors = {
        titulo: !data.titulo.trim() ? "Informe um título." : "",
        descricao: !data.descricao.trim()
          ? "Conte um pouco sobre sua experiência."
          : data.descricao.length > 220
            ? "Use até 220 caracteres."
            : "",
        nota:
          !Number.isFinite(number) || number < 0 || number > 10
            ? "A nota deve estar entre 0 e 10."
            : "",
      };
      Object.entries(errors).forEach(
        ([key, message]) =>
          (area.querySelector(`[data-error="${key}"]`).textContent = message),
      );
      if (Object.values(errors).some(Boolean)) return;
      const submit = event.currentTarget.querySelector("[type=submit]");
      submit.disabled = true;
      try {
        const payload = {
          titulo: data.titulo.trim(),
          descricao: data.descricao.trim(),
          nota: number,
        };
        if (!review) {
          payload.produto_id = Number(id);
          payload.data = dateToAPI(todayISO());
        }
        await ParryHelp.apiFetch(
          review
            ? `/avaliacoes/${review.id}`
            : `/usuarios/${ParryHelp.getUsuarioLogado().id}/avaliacoes`,
          {
            method: review ? "PUT" : "POST",
            body: JSON.stringify(payload),
          },
        );
        ParryHelp.showToast(
          review ? "Avaliação atualizada." : "Avaliação publicada.",
        );
        await load();
      } catch (error) {
        area.querySelector("[data-review-error]").textContent = error.message;
      } finally {
        submit.disabled = false;
      }
    });
  }
  async function deleteReview(reviewId) {
    if (
      !window.confirm(
        "Excluir esta avaliação? Esta ação não pode ser desfeita.",
      )
    )
      return;
    try {
      await ParryHelp.apiFetch(`/avaliacoes/${reviewId}`, {
        method: "DELETE",
      });
      ParryHelp.showToast("Avaliação excluída.");
      await load();
    } catch (error) {
      ParryHelp.showToast(error.message, true);
    }
  }
  async function generateSummary() {
    const button = shell.querySelector("[data-ai-review-button]");
    const text = shell.querySelector("[data-ai-review]");
    button.disabled = true;
    button.textContent = "Preparando resumo…";
    try {
      const result = await ParryHelp.apiFetch("/api/tutoria", {
        method: "POST",
        body: JSON.stringify({
          tipo: "avaliacoes_relevantes",
          produto_id: Number(id),
          limite: 10,
        }),
      });
      text.textContent = result.resumo;
    } catch (error) {
      text.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Gerar resumo ↗";
    }
  }
  async function load() {
    if (!Number.isInteger(id) || id < 1) {
      shell.innerHTML = `<div class="error-state">
        <h2>Produto não informado.</h2>
        <p>Abra uma ficha a partir do catálogo.</p>
        <a class="button button-primary" href="catalogo.html">Ir ao catálogo ↗</a>
        </div>`;
      return;
    }
    try {
      [product, reviews] = await Promise.all([
        ParryHelp.apiFetch(`/produtos/${id}`),
        ParryHelp.apiFetch("/avaliacoes"),
      ]);
      reviews = reviews.filter((item) => Number(item.produto_id) === id);
      const categories = await ParryHelp.apiFetch("/categorias");
      const category = categoryFor(categories);
      authors = {};
      render(category);
    } catch (error) {
      shell.innerHTML = `<div class="error-state">
        <h2>Não foi possível abrir esta ficha.</h2>
        <p>${escape(error.message)}</p>
        <button class="button button-primary" data-retry>Recarregar ↻</button>
        <a class="text-link" href="catalogo.html">Voltar ao catálogo</a>
        </div>`;
      shell.querySelector("[data-retry]").addEventListener("click", load);
    }
  }
  document.addEventListener("parryhelp:login", () => {
    const area = shell.querySelector("[data-review-form-area]");
    if (area && !area.firstElementChild) reviewForm();
  });
  shell.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-review-edit]");
    const remove = event.target.closest("[data-review-delete]");
    if (edit) reviewForm(reviews.find((review) => Number(review.id) === Number(edit.dataset.reviewEdit)));
    if (remove) deleteReview(Number(remove.dataset.reviewDelete));
  });
  load();
})();
