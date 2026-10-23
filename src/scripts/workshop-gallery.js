// The controls are ordinary buttons so the gallery works with touch and keyboards.
document.querySelectorAll('[data-shop-gallery]').forEach((gallery) => {
  const projects = [...gallery.querySelectorAll('[data-gallery-project]')];
  const photos = [...gallery.querySelectorAll('[data-gallery-photo]')];
  const image = gallery.querySelector('[data-gallery-image]');
  const label = gallery.querySelector('[data-gallery-label]');
  const title = gallery.querySelector('[data-gallery-title]');
  const detail = gallery.querySelector('[data-gallery-detail]');
  const notes = gallery.querySelector('[data-gallery-notes]');
  const notesText = gallery.querySelector('[data-gallery-notes-text]');
  const source = gallery.querySelector('[data-gallery-source]');
  const overline = gallery.querySelector('[data-gallery-overline]');
  const dial = gallery.querySelector('.shop-gallery__dial');
  const expand = gallery.querySelector('[data-gallery-expand]');
  const dialog = gallery.querySelector('[data-gallery-dialog]');
  const dialogImage = gallery.querySelector('[data-gallery-dialog-image]');
  const dialogTitle = gallery.querySelector('[data-gallery-dialog-title]');
  let selectedProject = 0;
  let bladeTurn = 0;

  function setProjectHeading(target, prefix, projectIndex, fallback) {
    const loveWord = projects[projectIndex].querySelector('.shop-gallery__love-word');
    target.replaceChildren(prefix, loveWord ? loveWord.cloneNode(true) : fallback);
  }

  function selectPhoto(photo) {
    image.src = photo.dataset.src;
    image.alt = photo.dataset.alt;
    expand.setAttribute('aria-label', `Expand photo: ${photo.dataset.title}`);
    const projectIndex = Number(photo.dataset.project);
    setProjectHeading(label, `${photo.dataset.label.split(' / ')[0]} / `, projectIndex, photo.dataset.label.split(' / ')[1]);
    title.textContent = photo.dataset.title;
    detail.textContent = photo.dataset.detail;
    notes.open = false;
    notes.hidden = !photo.dataset.buildNotes;
    notesText.textContent = photo.dataset.buildNotes || '';
    source.hidden = !photo.dataset.sourceUrl;
    if (photo.dataset.sourceUrl) source.href = photo.dataset.sourceUrl;
    photos.forEach((button) => button.setAttribute('aria-pressed', String(button === photo)));
  }

  function selectProject(index) {
    projects.forEach((button, buttonIndex) => button.setAttribute('aria-pressed', String(buttonIndex === index)));
    photos.forEach((button) => { button.hidden = Number(button.dataset.project) !== index; });
    // Each project change advances the teeth in their cutting direction.
    if (index !== selectedProject) {
      bladeTurn -= 120;
      dial.style.setProperty('--dial-turn', `${bladeTurn}deg`);
      selectedProject = index;
    }
    setProjectHeading(overline, 'DETAILS / ', index, projects[index].dataset.projectName.toUpperCase());
    selectPhoto(photos.find((button) => Number(button.dataset.project) === index));
  }

  projects.forEach((button, index) => button.addEventListener('click', () => selectProject(index)));
  photos.forEach((button) => button.addEventListener('click', () => selectPhoto(button)));
  expand.addEventListener('click', () => {
    dialogImage.src = image.getAttribute('src');
    dialogImage.alt = image.alt;
    dialogTitle.textContent = title.textContent;
    dialog.showModal();
  });
  gallery.querySelector('[data-gallery-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});
