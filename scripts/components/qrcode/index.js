const QR_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
const MAX_QR_URL_LENGTH = 2048;

let loadPromise = null;

function loadQRCodeLib() {
  if (window.QRCode) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = QR_CDN;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load QRCode library'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function renderQR(container, url) {
  container.innerHTML = '';

  const warning = document.createElement('p');
  warning.className = 'share-panel__warning';

  if (url.length > MAX_QR_URL_LENGTH) {
    warning.textContent = 'URL too long for reliable QR — copy link instead.';
    container.appendChild(warning);
    return;
  }

  try {
    await loadQRCodeLib();
    const qrWrap = document.createElement('div');
    qrWrap.className = 'share-panel__qr-code';
    container.appendChild(qrWrap);

    new window.QRCode(qrWrap, {
      text: url,
      width: 200,
      height: 200,
      colorDark: '#1a1a2e',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M,
    });
  } catch {
    warning.textContent = 'Could not generate QR code — copy link instead.';
    container.appendChild(warning);
  }
}
