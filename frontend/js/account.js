import { PAGE_SIZE, renderPagination } from "./ui-helpers.js";

(() => {
  const root = document.querySelector("[data-account-content]");
  const escape = ParryHelp.escapeHTML;
  async function load() {
    const user = ParryHelp.getUsuarioLogado();
    if (!user) {
      root.innerHTML = `<div class="empty-state">
        <span class="empty-mark">↗</span>
        <h2>Entre para abrir seu espaço.</h2>
        <p>Use seu cadastro para acompanhar e editar suas avaliações.</p>
        <button class="button button-primary" data-open-auth data-auth-mode="login">Entrar no Parry Help</button>
        </div>`;
      return;
    }
    root.innerHTML = '<div class="skeleton-row"></div>';
    try {
      const [profile, history, products] = await Promise.all([
        ParryHelp.apiFetch(`/usuarios/${Number(user.id)}`),
        ParryHelp.apiFetch(`/usuarios/${Number(user.id)}/avaliacoes`),
        ParryHelp.apiFetch("/produtos"),
      ]);
      history.forEach((review) => {
        review.produto_id ||= products.find(
          (product) => product.nome === review.produto_nome,
        )?.id;
      });
      render(profile, history, products.filter((product) => Number(product.criado_por_id) === Number(user.id)));
    } catch (error) {
      root.innerHTML = `<div class="error-state">
        <h2>Não foi possível carregar sua conta.</h2>
        <p>${escape(error.message)}</p>
        <button class="button button-primary" data-retry>Recarregar ↻</button>
        </div>`;
      root.querySelector("[data-retry]").addEventListener("click", load);
    }
  }
  function render(user, reviews, products) {
    root.innerHTML = `<div class="account-summary">
        <section class="account-panel account-profile-panel">
        <div class="account-panel-heading">
        <h2>Seus dados</h2>
        <button class="quiet-button" data-edit-profile>Editar dados <span aria-hidden="true">↗</span></button>
        </div>
        <dl>
        <div>
        <dt>Nome</dt>
        <dd>${escape(user.nome)}</dd>
        </div>
        <div>
        <dt>E-mail</dt>
        <dd>${escape(user.email)}</dd>
        </div>
        </dl>
        <div data-profile-form>
        </div>
        </section>
        <section class="account-panel">
        <h2>Preferências</h2>
        <p>Escolha o tema que fica mais confortável para você.</p>
        <div class="theme-choice">
        <button class="button button-quiet" data-set-theme="light">Tema claro</button>
        <button class="button button-quiet" data-set-theme="dark">Tema escuro</button>
        <button class="button button-quiet" data-set-theme="system">Seguir dispositivo</button>
        </div>
        </section>
        </div>
        <section class="account-reviews" aria-labelledby="account-reviews-title">
          <div class="account-section-heading"><div><h2 id="account-reviews-title">Suas avaliações</h2><p>As experiências que você compartilhou.</p></div><span class="account-review-count">${reviews.length}</span></div>
          <div data-account-reviews aria-live="polite"></div>
          <nav class="pagination" data-account-review-pagination aria-label="Páginas das suas avaliações"></nav>
        </section>
        <section class="account-products" aria-labelledby="account-products-title">
          <div class="account-section-heading"><div><h2 id="account-products-title">Produtos que você adicionou</h2><p>Suas contribuições para o catálogo da comunidade.</p></div><span class="account-review-count">${products.length}</span></div>
          <p class="form-error" data-account-products-error role="alert"></p>
          <div class="account-products-list" data-account-products aria-live="polite"></div>
          <nav class="pagination" data-account-product-pagination aria-label="Páginas dos seus produtos"></nav>
        </section>
        <section class="account-panel danger-zone">
        <div class="danger-copy">
        <h2>Encerrar conta</h2>
        <p>A remoção apaga seu perfil e suas avaliações de forma permanente.</p>
        </div>
        <button class="quiet-button" data-delete-account>Excluir minha conta</button>
        </section>`;
    const showReviews = (page = 1) => {
      root.querySelector("[data-account-reviews]").innerHTML = reviews.length
        ? reviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((review) => `<article class="review-item"><div class="review-head"><strong>${escape(review.produto_nome || "Produto")}</strong><span>${Number(review.nota).toFixed(1)} / 10 · ${escape(review.data || "")}</span></div><h3>${escape(review.titulo)}</h3><p>${escape(review.descricao)}</p><a class="mini-link" href="produto.html?id=${Number(review.produto_id || 0)}#avaliacoes">Abrir avaliação ↗</a></article>`).join("")
        : '<div class="empty-state account-empty"><h2>Sua primeira avaliação ainda está por vir.</h2><p>Compartilhe uma experiência para ajudar a próxima pessoa a escolher.</p><a class="button button-primary" href="catalogo.html">Explorar produtos ↗</a></div>';
      renderPagination(root.querySelector("[data-account-review-pagination]"), page, reviews.length, showReviews, "avaliações");
    };
    let productsPage = 1;
    let removingProduct = false;
    const showProducts = (page = 1) => {
      page = Math.max(1, Math.min(page, Math.ceil(products.length / PAGE_SIZE)));
      productsPage = page;
      root.querySelector(".account-products .account-review-count").textContent = products.length;
      root.querySelector("[data-account-products]").innerHTML = products.length
        ? products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((product) => `<article class="account-product-card"><span class="account-product-mark" aria-hidden="true">${escape(product.nome.charAt(0))}</span><div><h3><a href="produto.html?id=${Number(product.id)}">${escape(product.nome)}</a></h3><p>${escape(product.descricao)}</p></div><div class="account-product-actions"><a class="button button-quiet" href="produto.html?id=${Number(product.id)}">Ver produto ↗</a><button class="button button-danger" type="button" data-remove-own-product="${Number(product.id)}" aria-label="Remover ${escape(product.nome)}">Remover produto</button></div></article>`).join("")
        : '<div class="empty-state account-empty"><h2>Seu primeiro produto começa aqui.</h2><p>Adicione ao catálogo um produto que a comunidade precisa conhecer.</p><a class="button button-primary" href="catalogo.html">Ir ao catálogo ↗</a></div>';
      renderPagination(root.querySelector("[data-account-product-pagination]"), page, products.length, showProducts, "produtos");
    };
    root.querySelector("[data-account-products]").addEventListener("click", async (event) => {
      const button = event.target.closest("[data-remove-own-product]");
      if (!button || removingProduct) return;
      const id = Number(button.dataset.removeOwnProduct);
      const product = products.find((item) => Number(item.id) === id);
      const currentUser = ParryHelp.getUsuarioLogado();
      if (!product || !currentUser?.token || Number(product.criado_por_id) !== Number(currentUser.id)) {
        ParryHelp.openAuth("login");
        return;
      }
      if (!window.confirm(`Remover “${product.nome}” e as avaliações associadas? Esta ação não pode ser desfeita.`)) return;
      const error = root.querySelector("[data-account-products-error]");
      const list = root.querySelector("[data-account-products]");
      error.textContent = "";
      removingProduct = true;
      list.setAttribute("aria-busy", "true");
      list.querySelectorAll("[data-remove-own-product]").forEach((action) => { action.disabled = true; });
      button.textContent = "Removendo…";
      try {
        await ParryHelp.apiFetch(`/produtos/${id}`, { method: "DELETE" });
        products.splice(products.findIndex((item) => Number(item.id) === id), 1);
        try {
          const selected = JSON.parse(sessionStorage.getItem("taxatio_compare") || "[]");
          if (Array.isArray(selected)) sessionStorage.setItem("taxatio_compare", JSON.stringify(selected.filter((item) => Number(item) !== id)));
        } catch { /* A saved comparison does not prevent removing a product. */ }
        showProducts(productsPage);
        ParryHelp.showToast("Produto removido.");
      } catch (failure) {
        error.textContent = failure.message;
      } finally {
        removingProduct = false;
        list.removeAttribute("aria-busy");
        list.querySelectorAll("[data-remove-own-product]").forEach((action) => {
          action.disabled = false;
          action.textContent = "Remover produto";
        });
      }
    });
    showReviews();
    showProducts();
    root
      .querySelector("[data-edit-profile]")
      .addEventListener("click", () => editProfile(user));
    root.querySelectorAll("[data-set-theme]").forEach((button) =>
      button.addEventListener("click", () => {
        const choice = button.dataset.setTheme;
        if (choice === "system") {
          localStorage.removeItem("taxatio_theme");
          document.documentElement.dataset.theme = matchMedia(
            "(prefers-color-scheme: dark)",
          ).matches
            ? "dark"
            : "light";
        } else {
          localStorage.setItem("taxatio_theme", choice);
          document.documentElement.dataset.theme = choice;
        }
        ParryHelp.showToast("Preferência de tema atualizada.");
      }),
    );
    root
      .querySelector("[data-delete-account]")
      .addEventListener("click", async () => {
        if (
          !window.confirm(
            "Excluir sua conta e todas as avaliações? Esta ação não pode ser desfeita.",
          )
        )
          return;
        try {
          await ParryHelp.apiFetch(`/usuarios/${Number(user.id)}`, {
            method: "DELETE",
          });
          localStorage.removeItem("taxatio_usuario");
          ParryHelp.updateAuth();
          ParryHelp.showToast("Conta excluída.");
          load();
        } catch (error) {
          ParryHelp.showToast(error.message, true);
        }
      });
  }
  function editProfile(user) {
    const target = root.querySelector("[data-profile-form]");
    target.innerHTML = `<form class="modal-form" data-profile-edit novalidate>
        <div class="field-wrap">
        <label for="profile-name">Nome</label>
        <input id="profile-name" name="nome" maxlength="40" required value="${escape(user.nome)}">
        </div>
        <div class="field-wrap">
        <label for="profile-email">E-mail</label>
        <input id="profile-email" name="email" type="email" maxlength="120" required value="${escape(user.email)}">
        </div>
        <div class="field-wrap">
        <label for="profile-password">Nova senha <span class="product-meta">(opcional)</span>
        </label>
        <input id="profile-password" name="senha" type="password" minlength="6" autocomplete="new-password">
        </div>
        <p class="form-error" data-profile-error role="alert">
        </p>
        <button class="button button-primary">Salvar dados</button>
        </form>`;
    target.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      const error = target.querySelector("[data-profile-error]");
      if (
        !fields.nome.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)
      ) {
        error.textContent = "Informe um nome e um e-mail válidos.";
        return;
      }
      const payload = {
        nome: fields.nome.trim(),
        email: fields.email.trim(),
      };
      if (fields.senha) payload.senha = fields.senha;
      try {
        const updated = await ParryHelp.apiFetch(`/usuarios/${Number(user.id)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        localStorage.setItem("taxatio_usuario", JSON.stringify({ ...updated, token: ParryHelp.getUsuarioLogado()?.token }));
        ParryHelp.updateAuth();
        ParryHelp.showToast("Seus dados foram atualizados.");
        load();
      } catch (failure) {
        error.textContent = failure.message;
      }
    });
  }
  load();
})();
