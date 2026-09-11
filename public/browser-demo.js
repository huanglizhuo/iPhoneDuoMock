const form = document.getElementById('open-form');
const input = document.getElementById('demo-url');
const error = document.getElementById('url-error');
// Browsers accept surprisingly loose URLs (e.g. spaces get percent-encoded into the host),
// so validate the shape ourselves before navigating.
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = input.value.trim();
  let url = null;
  if (value && !/\s/.test(value)) {
    try {
      url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    } catch {
      url = null;
    }
  }
  const valid =
    !!url &&
    ['http:', 'https:'].includes(url.protocol) &&
    !url.username &&
    !url.password &&
    /^[a-z0-9.-]+(:\d+)?$/i.test(url.host);
  if (!valid) {
    error.hidden = false;
    return;
  }
  error.hidden = true;
  location.href = url.href;
});
input.addEventListener('input', () => {
  error.hidden = true;
});
function dimensions() {
  document.getElementById('viewport').textContent = `Live CSS viewport: ${innerWidth} × ${innerHeight} px`;
}
addEventListener('resize', dimensions);
dimensions();
