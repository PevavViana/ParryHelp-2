import { attachCharacterCounter } from "./ui-helpers.js";

(() => {
  const dialog = document.querySelector("[data-create-product-dialog]");
  const form = dialog.querySelector("form");
  const category = form.elements.categoria_id;
  attachCharacterCounter(form.elements.descricao);
  const image = form.elements.imagem;
  const preview = form.querySelector("[data-create-product-preview]");
  const error = form.querySelector("[data-create-product-error]");
  const submit = form.querySelector("[data-create-product-submit]");
  const close = dialog.querySelector("[data-close-product-dialog]");
  let previewUrl;
  let uploadedImageUrl = "";
  let pendingLogin = false;
  let saving = false;

  async function open() {
    if (!ParryHelp.getUsuarioLogado()?.token) {
      pendingLogin = true;
      ParryHelp.showToast("Entre na sua conta para adicionar um produto.");
      ParryHelp.openAuth("login");
      return;
    }
    if (dialog.open) return;
    pendingLogin = false;
    error.textContent = "";
    dialog.showModal();
    submit.disabled = true;
    category.disabled = true;
    try {
      const categories = await ParryHelp.apiFetch("/categorias");
      category.innerHTML = '<option value="">Selecione uma categoria</option>' + categories.map((item) =>
        `<option value="${Number(item.id)}">${ParryHelp.escapeHTML(item.nome)}</option>`,
      ).join("");
      category.disabled = !categories.length;
      submit.disabled = !categories.length;
      if (!categories.length) error.textContent = "Nenhuma categoria disponível. Cadastre uma em Gerenciar catálogo.";
    } catch (requestError) {
      error.textContent = requestError.message + " Feche e abra novamente para tentar outra vez.";
    }
  }

  document.querySelector("[data-add-product]").addEventListener("click", open);
  document.addEventListener("parryhelp:login", () => {
    if (pendingLogin) open();
  });
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", (event) => {
    if (saving) event.preventDefault();
  });

  image.addEventListener("change", () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    uploadedImageUrl = "";
    preview.hidden = true;
    preview.removeAttribute("src");
    error.textContent = "";
    const file = image.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
      error.textContent = "Selecione uma imagem PNG, JPG, GIF ou WebP de até 5 MB.";
      image.value = "";
      return;
    }
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.hidden = false;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!ParryHelp.getUsuarioLogado()?.token) {
      dialog.close();
      open();
      return;
    }
    const data = new FormData(form);
    if (!data.get("nome").trim() || !data.get("descricao").trim()) {
      error.textContent = "Preencha o nome e a descrição do produto.";
      return;
    }
    saving = true;
    submit.disabled = true;
    close.disabled = true;
    image.disabled = true;
    submit.textContent = "Salvando…";
    error.textContent = "";
    try {
      const file = data.get("imagem");
      if (file.size && !uploadedImageUrl) {
        const upload = new FormData();
        upload.append("imagem", file);
        const result = await ParryHelp.apiFetch("/produtos/imagem", { method: "POST", body: upload });
        uploadedImageUrl = result.imagem_url;
      }
      const product = await ParryHelp.apiFetch("/produtos", {
        method: "POST",
        body: JSON.stringify({
          nome: data.get("nome").trim(),
          descricao: data.get("descricao").trim(),
          categoria_id: Number(data.get("categoria_id")),
          imagem_url: uploadedImageUrl,
        }),
      });
      window.location.href = `produto.html?id=${Number(product.id)}`;
    } catch (requestError) {
      error.textContent = requestError.message;
      if (!ParryHelp.getUsuarioLogado()?.token) {
        dialog.close();
        open();
      }
    } finally {
      saving = false;
      submit.disabled = false;
      close.disabled = false;
      image.disabled = false;
      submit.textContent = "Adicionar produto";
    }
  });
})();
