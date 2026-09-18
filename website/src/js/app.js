import '../css/global.css';
import { setupNavigation, routes } from '../components/navigation/navigation.js';
import { renderCover } from '../components/cover/cover.js';
import { renderHome } from '../pages/home/home.js';
import { renderGuests } from '../pages/guests/guests.js';
import { renderMaterials } from '../pages/materials/materials.js';
import { renderSchedule } from '../pages/schedule/schedule.js';
import { renderHostScript } from '../pages/host-script/host-script.js';
const page = document.querySelector('#page');
const updateNavigation = setupNavigation(document.querySelector('#navigation'));
renderCover(document.querySelector('#cover'));
let cleanup;
function render() {
  cleanup?.();
  const hash = location.hash.slice(1);
  const route = routes.find(([key]) => key === hash)?.[0] || 'home';
  updateNavigation(route);
  if (route === 'home') cleanup = renderHome(page);
  else if (route === 'guests') cleanup = renderGuests(page);
  else if (route === 'materials') cleanup = renderMaterials(page);
  else if (route === 'schedule') cleanup = renderSchedule(page);
  else if (route === 'script') cleanup = renderHostScript(page);
  else { cleanup = null; page.innerHTML = '<section class="placeholder"><p class="eyebrow">Coming soon</p><h1></h1><p>该模块正在准备中</p></section>'; page.querySelector('h1').textContent = routes.find(([key]) => key === route)[1]; }
  document.title = `${routes.find(([key]) => key === route)[1]} · 宁忠瑞 & 吴南`;
}
window.addEventListener('hashchange', render);
render();
