(function () {
  'use strict';
  const config = window.RNK_CHAT_CONFIG || {};
  const chatForm = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const log = document.getElementById('chat-messages');
  const notice = document.getElementById('chat-notice');
  const send = document.getElementById('chat-send');
  const dialog = document.getElementById('consultation-dialog');
  const form = document.getElementById('consultation-form');
  const feedback = document.getElementById('form-feedback');
  const submit = document.getElementById('consultation-submit');
  const recovery = document.getElementById('form-recovery');
  const history = [];
  let busy = false;
  let formBusy = false;
  let previousFocus;
  let savedOverflow = '';
  let requestId = '';
  let lastPayload = '';
  const defaultNotice = config.chatEndpoint
    ? 'La IA puede equivocarse. José confirma el alcance y el precio de cada propuesta.'
    : 'La IA aún no está conectada. Puedes contactarnos por WhatsApp.';
  notice.textContent = defaultNotice;
  if (config.chatEndpoint) document.getElementById('assistant-state').textContent = 'Asistente IA';
  if (config.consultationEndpoint) {
    submit.textContent = 'Enviar solicitud';
    document.getElementById('form-footnote').textContent = 'Enviaremos tu solicitud a RNK para que José pueda contactarte. No implica una contratación.';
  }
  function whatsappUrl(data) {
    return 'https://wa.me/56935443498?text=' + encodeURIComponent(
      'Hola, vengo desde la web de RNK. Quiero solicitar una asesoría.\n\n' +
      'Nombre: ' + data.name + '\n' + (data.company ? 'Negocio: ' + data.company + '\n' : '') +
      'Contacto: ' + data.contact + '\nNecesito: ' + data.need
    );
  }
  async function post(url, data) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), signal: controller.signal,
      });
      if (!response.ok) throw new Error('Request failed');
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  function addMessage(role, text) {
    const message = document.createElement('div');
    message.className = 'chat-message chat-message--' + role;
    message.textContent = text;
    log.append(message);
    log.scrollTop = log.scrollHeight;
  }
  document.querySelectorAll('[data-prompt]').forEach(button => {
    button.addEventListener('click', () => {
      if (busy) return;
      input.value = button.dataset.prompt;
      input.focus();
    });
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing &&
        !window.matchMedia('(pointer: coarse)').matches) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });
  chatForm.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    if (!config.chatEndpoint) {
      notice.textContent = 'El asistente aún no está disponible. Puedes usar «Solicitar asesoría» para continuar con tu consulta por WhatsApp.';
      return;
    }
    busy = true;
    send.disabled = true;
    input.readOnly = true;
    log.setAttribute('aria-busy', 'true');
    notice.textContent = 'Preparando tu respuesta…';
    try {
      const result = await post(config.chatEndpoint, { messages: [...history, {role: 'user', content: text}].slice(-20) });
      if (typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('Empty response');
      addMessage('user', text);
      addMessage('assistant', result.reply);
      history.push({role: 'user', content: text}, {role: 'assistant', content: result.reply});
      input.value = '';
      notice.textContent = defaultNotice;
    } catch (_) {
      notice.textContent = 'No pudimos obtener una respuesta. Conservamos tu mensaje para que puedas reintentarlo o solicitar asesoría.';
    } finally {
      busy = false;
      send.disabled = false;
      input.readOnly = false;
      log.setAttribute('aria-busy', 'false');
    }
  });
  function openForm() {
    previousFocus = document.activeElement;
    if (!form.elements.need.value.trim()) {
      form.elements.need.value = [...history.filter(m => m.role === 'user').map(m => m.content), input.value.trim()].filter(Boolean).join('\n').slice(0, 2000);
    }
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    form.elements.name.focus();
  }
  document.querySelectorAll('[data-open-consultation]').forEach(button => button.addEventListener('click', openForm));
  document.getElementById('close-consultation').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.style.overflow = savedOverflow;
    if (previousFocus) previousFocus.focus();
  });
  form.elements.contact.addEventListener('input', () => form.elements.contact.setCustomValidity(''));
  form.addEventListener('input', () => { recovery.hidden = true; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (formBusy) return;
    const data = Object.fromEntries(new FormData(form));
    for (const key of ['name','company','contact','need']) data[key] = (data[key] || '').trim();
    if (!data.name || !data.need) {
      feedback.textContent = 'Completa tu nombre y describe qué necesitas.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact) && !/^\+?[\d\s()-]{8,25}$/.test(data.contact)) {
      form.elements.contact.setCustomValidity('Introduce un correo válido o un teléfono con código de país.');
      form.elements.contact.reportValidity();
      return;
    }
    const wa = whatsappUrl(data);
    if (!config.consultationEndpoint) {
      recovery.href = wa;
      recovery.hidden = false;
      window.open(wa, '_blank', 'noopener,noreferrer');
      feedback.textContent = 'Tu solicitud está preparada. Pulsa Enviar en WhatsApp para compartirla con RNK. Si no se abrió, usa el enlace de abajo.';
      return;
    }
    const payload = JSON.stringify(data);
    if (payload !== lastPayload) {
      requestId = crypto.randomUUID();
      lastPayload = payload;
    }
    formBusy = true;
    submit.disabled = true;
    feedback.textContent = 'Enviando tu solicitud…';
    try {
      const result = await post(config.consultationEndpoint, {...data, consent: true, requestId});
      if (result.saved !== true || !result.requestId) throw new Error('Save not confirmed');
      form.reset();
      lastPayload = '';
      feedback.textContent = 'Solicitud recibida. José podrá contactarte por el medio que indicaste.';
    } catch (_) {
      feedback.textContent = 'No pudimos confirmar la recepción. Tus datos siguen aquí: reintenta o continúa por WhatsApp.';
      recovery.href = wa;
      recovery.hidden = false;
    } finally {
      formBusy = false;
      submit.disabled = false;
    }
  });
})();
