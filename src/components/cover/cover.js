import coverUrl from '../../photos/cover.png';
export function renderCover(container) {
  const image = document.createElement('img');
  image.src = coverUrl;
  image.alt = '交握的双手与订婚戒指';
  image.className = 'cover-photo';
  image.fetchPriority = 'high';
  container.className = 'cover';
  container.append(image);
  image.addEventListener('error', () => { image.hidden = true; container.classList.add('cover-fallback'); });
}
