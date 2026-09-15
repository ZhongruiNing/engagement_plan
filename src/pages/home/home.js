import template from './home.html?raw';
import './home.css';
import { eventConfig } from '../../js/config.js';
import { mountMap } from '../../components/map/map.js';
export function renderHome(container) {
  container.innerHTML = template;
  container.querySelector('h1').textContent = eventConfig.title;
  container.querySelector('.couple').textContent = eventConfig.couple;
  container.querySelector('time').textContent = eventConfig.dateLabel;
  return mountMap(container.querySelector('#hotel-map'));
}
