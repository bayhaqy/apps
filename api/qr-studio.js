/**
 * Bayhaqy Apps API — QR Code Generator module
 * Public, no-token, client-side JavaScript.
 *
 * NOTE: This module formats content (Wi-Fi, vCard, mailto, etc.) but does NOT
 * render the QR image itself. For image generation, load qrcode.js from CDN:
 *   <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"></script>
 * then call QRCode.toCanvas(canvas, text, options) or QRCode.toDataURL(text, options).
 *
 * Usage:
 *   import { formatWifi, formatVCard, formatEmail } from '/apps/api/qr-studio.js';
 *   const text = formatWifi({ ssid: 'MyWiFi', password: 'pass123', encryption: 'WPA' });
 */

/**
 * Format Wi-Fi credentials as a QR-scannable string.
 * @param {Object} params
 * @param {string} params.ssid
 * @param {string} [params.password]
 * @param {string} [params.encryption] - 'WPA' | 'WEP' | 'None' (default 'WPA')
 * @param {boolean} [params.hidden]
 */
function formatWifi(params) {
  var ssid = (params.ssid || '').replace(/([\\;,:"])/g, '\\$1');
  var pass = (params.password || '').replace(/([\\;,:"])/g, '\\$1');
  var enc = params.encryption || 'WPA';
  var hidden = params.hidden ? 'true' : 'false';
  return 'WIFI:T:' + enc + ';S:' + ssid + ';P:' + pass + ';H:' + hidden + ';;';
}

/**
 * Format email as mailto QR string.
 */
function formatEmail(params) {
  var s = 'mailto:' + (params.to || '');
  var q = [];
  if (params.subject) q.push('subject=' + encodeURIComponent(params.subject));
  if (params.body) q.push('body=' + encodeURIComponent(params.body));
  if (q.length) s += '?' + q.join('&');
  return s;
}

/**
 * Format SMS QR string.
 */
function formatSms(params) {
  return 'smsto:' + (params.number || '') + ':' + (params.message || '');
}

/**
 * Format phone as tel: QR string.
 */
function formatPhone(params) {
  return 'tel:' + (params.number || '');
}

/**
 * Format vCard 3.0.
 */
function formatVCard(params) {
  var lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  if (params.name) lines.push('FN:' + params.name);
  if (params.phone) lines.push('TEL;TYPE=CELL:' + params.phone);
  if (params.email) lines.push('EMAIL:' + params.email);
  if (params.org) lines.push('ORG:' + params.org);
  if (params.title) lines.push('TITLE:' + params.title);
  if (params.url) lines.push('URL:' + params.url);
  if (params.address) lines.push('ADR:;;' + params.address);
  lines.push('END:VCARD');
  return lines.join('\n');
}

/**
 * Generate a QR code data URL using the qrcode library (must be loaded first).
 * @param {Object} params
 * @param {string} params.text - content to encode
 * @param {number} [params.width] - pixel size (default 256)
 * @param {string} [params.colorDark] - hex (default '#000000')
 * @param {string} [params.colorLight] - hex (default '#FFFFFF')
 * @param {string} [params.errorCorrectionLevel] - 'L'|'M'|'Q'|'H' (default 'M')
 * @param {number} [params.margin] - modules (default 4)
 * @returns {Promise<string>} data URL
 */
async function generateQrDataUrl(params) {
  if (typeof QRCode === 'undefined') throw new Error('QRCode library not loaded. Include https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js first.');
  return await QRCode.toDataURL(params.text, {
    width: params.width || 256,
    color: { dark: params.colorDark || '#000000', light: params.colorLight || '#FFFFFF' },
    errorCorrectionLevel: params.errorCorrectionLevel || 'M',
    margin: params.margin != null ? params.margin : 4
  });
}

export { formatWifi, formatEmail, formatSms, formatPhone, formatVCard, generateQrDataUrl };
if (typeof module !== 'undefined' && module.exports) module.exports = { formatWifi, formatEmail, formatSms, formatPhone, formatVCard, generateQrDataUrl };
