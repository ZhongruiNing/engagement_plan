export const routes = [['home', '首页'], ['guests', '宾客名单'], ['staff', '人员安排'], ['materials', '物料准备'], ['schedule', '议程安排'], ['script', '主持词']];
export function setupNavigation(container) {
  const links = routes.map(([route, label], index) => {
    const a = document.createElement('a');
    a.href = `#${route}`;
    a.innerHTML = `<span class="nav-number" aria-hidden="true">0${index + 1}</span><span>${label}</span>`;
    container.append(a);
    a.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') wave(index); });
    a.addEventListener('focus', () => wave(index));
    return a;
  });
  function wave(index = -10) {
    links.forEach((a, i) => a.style.setProperty('--nav-scale', Math.abs(i - index) === 0 ? '1.12' : Math.abs(i - index) === 1 ? '1.06' : Math.abs(i - index) === 2 ? '1.02' : '1'));
  }
  container.addEventListener('pointerleave', () => wave());
  container.addEventListener('focusout', () => wave());
  return route => links.forEach((a, i) => {
    if (routes[i][0] === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
