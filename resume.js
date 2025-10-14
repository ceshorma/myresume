import { getSocialIconPath, getTechIconPath } from './tech-icons.js';

const state = {
  payload: null,
  currentLanguage: null,
  sectionObserver: null,
  navigationLinks: new Map(),
  activeSectionId: null,
  sectionElements: [],
  scrollHandler: null,
  scrollFrame: null,
  backToTopButton: null,
};

document.addEventListener('DOMContentLoaded', loadResume);
window.addEventListener('hashchange', handleHashChange);

async function loadResume() {
  try {
    const response = await fetch('resume-data.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`No se pudo cargar el archivo de datos: ${response.status}`);
    }

    const data = await response.json();
    state.payload = data;
    const languages = data.languages || {};
    const languageKeys = Object.keys(languages);

    if (languageKeys.length === 0) {
      throw new Error('No hay idiomas configurados en resume-data.json');
    }

    const preferred = languageKeys.includes(data.defaultLanguage)
      ? data.defaultLanguage
      : languageKeys[0];

    applyLanguage(preferred);
  } catch (error) {
    console.error('Error al inicializar el CV:', error);
  }
}

function applyLanguage(languageCode) {
  if (!state.payload?.languages) return;

  const languageData = state.payload.languages[languageCode];
  if (!languageData) {
    console.warn(`Idioma no encontrado: ${languageCode}`);
    return;
  }

  const previousScrollY = window.scrollY;

  state.currentLanguage = languageCode;
  state.activeSectionId = null;
  state.navigationLinks = new Map();
  disconnectObserver();

  updateDocumentMeta(languageData);
  renderLanguageSwitcher(state.payload.languages, languageCode);
  renderSidebar(languageData);
  renderSections(languageData.sections);
  renderBackToTop(languageData);

  requestAnimationFrame(() => {
    window.scrollTo({ top: previousScrollY });
    setupSectionObserver();

    if (window.location.hash) {
      handleHashChange();
    } else if (Array.isArray(languageData.sections) && languageData.sections.length > 0) {
      setActiveSection(languageData.sections[0].id);
    }
  });
}

function updateDocumentMeta(languageData) {
  const { metaTitle, locale } = languageData;
  if (metaTitle) {
    document.title = metaTitle;
  }

  if (locale) {
    document.documentElement.lang = locale;
  }
}

function renderLanguageSwitcher(languages, activeLanguage) {
  const container = document.getElementById('sidebar-languages');
  if (!container) return;

  container.innerHTML = '';

  Object.entries(languages).forEach(([code, langData]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sidebar__language';
    const label = langData?.language?.label || code.toUpperCase();
    const shortLabel = langData?.language?.shortLabel || code.toUpperCase();

    button.textContent = shortLabel;
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.setAttribute('aria-pressed', code === activeLanguage ? 'true' : 'false');

    if (code === activeLanguage) {
      button.classList.add('is-active');
    }

    button.addEventListener('click', () => {
      if (code !== state.currentLanguage) {
        applyLanguage(code);
      }
    });

    container.appendChild(button);
  });
}

function renderSidebar(languageData) {
  const { identity, contact, lastUpdate, sections = [], aria = {} } = languageData;

  setText('sidebar-intro', identity?.intro);
  setText('sidebar-name', identity?.name);
  setText('sidebar-role', identity?.role);
  setText('sidebar-summary', identity?.summary);

  const emailLink = document.getElementById('sidebar-email');
  if (emailLink) {
    if (contact?.email) {
      emailLink.href = `mailto:${contact.email}`;
      emailLink.textContent = contact.email;
    } else {
      emailLink.removeAttribute('href');
      emailLink.textContent = '';
    }

    if (aria?.email) {
      emailLink.setAttribute('aria-label', aria.email);
      emailLink.setAttribute('title', aria.email);
    }
  }

  const linksContainer = document.getElementById('sidebar-links');
  if (linksContainer) {
    linksContainer.innerHTML = '';

    if (Array.isArray(contact?.links)) {
      contact.links.forEach((link) => {
        if (!link?.url || !link?.label) return;

        const anchor = document.createElement('a');
        anchor.className = 'sidebar__link';
        anchor.href = link.url;
        anchor.rel = 'noreferrer noopener';
        anchor.target = '_blank';

        if (link.ariaLabel) {
          anchor.setAttribute('aria-label', link.ariaLabel);
        }

        anchor.setAttribute('title', link.ariaLabel || link.label);

        const iconSlug = link.icon ? toSlug(link.icon) : toSlug(link.label);
        const iconPath = iconSlug ? getSocialIconPath(iconSlug) : null;
        if (iconPath) {
          const icon = createIconElement(iconPath, 'icon sidebar__link-icon');
          anchor.appendChild(icon);
        }

        const text = document.createElement('span');
        text.className = 'sidebar__link-label';
        text.textContent = link.label;
        anchor.appendChild(text);

        linksContainer.appendChild(anchor);
      });
    }
  }

  const downloadLink = document.getElementById('sidebar-download');
  if (downloadLink) {
    const download = contact?.download;

    if (download?.url && download?.label) {
      downloadLink.hidden = false;
      downloadLink.href = download.url;
      downloadLink.textContent = download.label;

      if (download.filename) {
        downloadLink.setAttribute('download', download.filename);
      } else {
        downloadLink.setAttribute('download', '');
      }

      if (download.ariaLabel) {
        downloadLink.setAttribute('aria-label', download.ariaLabel);
      } else {
        downloadLink.removeAttribute('aria-label');
      }

      const tooltip = download.tooltip || download.ariaLabel || download.label;
      if (tooltip) {
        downloadLink.setAttribute('title', tooltip);
      } else {
        downloadLink.removeAttribute('title');
      }
    } else {
      downloadLink.hidden = true;
      downloadLink.textContent = '';
      downloadLink.removeAttribute('href');
      downloadLink.removeAttribute('aria-label');
      downloadLink.removeAttribute('title');
      downloadLink.removeAttribute('download');
    }
  }

  const updateNode = document.getElementById('sidebar-update');
  if (updateNode) {
    updateNode.textContent = lastUpdate || '';
  }

  const navElement = document.querySelector('.sidebar__nav');
  if (navElement && aria?.nav) {
    navElement.setAttribute('aria-label', aria.nav);
  }

  const languageSwitcher = document.getElementById('sidebar-languages');
  if (languageSwitcher && aria?.languageSwitcher) {
    languageSwitcher.setAttribute('aria-label', aria.languageSwitcher);
    languageSwitcher.setAttribute('title', aria.languageSwitcher);
  }

  renderNavigation(sections);
}

function renderNavigation(sections = []) {
  const navList = document.getElementById('sidebar-nav');
  if (!navList) return;

  state.navigationLinks = new Map();
  navList.innerHTML = '';

  sections.forEach((section) => {
    if (!section?.id || !section?.number || !section?.navLabel) return;

    const listItem = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = `#${section.id}`;

    const indexSpan = document.createElement('span');
    indexSpan.className = 'sidebar__nav-index';
    indexSpan.textContent = section.number;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'sidebar__nav-text';
    labelSpan.textContent = section.navLabel;

    anchor.append(indexSpan, labelSpan);

    anchor.addEventListener('click', () => {
      requestAnimationFrame(() => {
        setActiveSection(section.id, { focus: true });
      });
    });

    listItem.appendChild(anchor);
    navList.appendChild(listItem);
    state.navigationLinks.set(section.id, anchor);
  });
}

function renderSections(sections = []) {
  const content = document.getElementById('resume-content');
  if (!content) return;

  content.innerHTML = '';

  sections.forEach((section) => {
    if (!section?.id || !section?.title || !section?.number) return;

    const sectionEl = document.createElement('section');
    sectionEl.className = 'section';
    sectionEl.id = section.id;
    sectionEl.setAttribute('tabindex', '-1');

    const header = document.createElement('header');
    header.className = 'section__header';

    const indexSpan = document.createElement('span');
    indexSpan.className = 'section__index';
    indexSpan.textContent = section.number;

    const titleEl = document.createElement('h2');
    titleEl.textContent = section.title;

    header.append(indexSpan, titleEl);
    sectionEl.appendChild(header);

    switch (section.type) {
      case 'about':
        sectionEl.appendChild(renderAboutSection(section));
        break;
      case 'timeline':
        sectionEl.appendChild(renderTimelineSection(section));
        break;
      case 'projects':
        sectionEl.appendChild(renderProjectsSection(section));
        break;
      case 'contact':
        sectionEl.appendChild(renderContactSection(section));
        break;
      default:
        break;
    }

    content.appendChild(sectionEl);
  });
}

function renderAboutSection(section) {
  const body = document.createElement('div');
  body.className = 'section__body';

  section.paragraphs?.forEach((text) => {
    if (!text) return;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    body.appendChild(paragraph);
  });

  if (Array.isArray(section.skills) && section.skills.length > 0) {
    const skillList = document.createElement('ul');
    skillList.className = 'skills tech-list';
    section.skills.forEach((skill) => {
      if (!skill) return;
      skillList.appendChild(createTechBadge(skill));
    });
    body.appendChild(skillList);
  }

  return body;
}

function renderTimelineSection(section) {
  const timeline = document.createElement('div');
  timeline.className = 'timeline';

  section.items?.forEach((item) => {
    if (!item?.role) return;

    const article = document.createElement('article');
    article.className = 'timeline__item';
    article.setAttribute('tabindex', '0');

    const header = document.createElement('header');
    const roleHeading = document.createElement('h3');
    roleHeading.textContent = item.role;
    header.appendChild(roleHeading);

    if (item.period) {
      const periodSpan = document.createElement('span');
      periodSpan.className = 'timeline__period';
      periodSpan.textContent = item.period;
      header.appendChild(periodSpan);
    }

    article.appendChild(header);

    if (Array.isArray(item.achievements) && item.achievements.length > 0) {
      const list = document.createElement('ul');
      item.achievements.forEach((achievement) => {
        if (!achievement) return;
        const listItem = document.createElement('li');
        listItem.textContent = achievement;
        list.appendChild(listItem);
      });
      article.appendChild(list);
    }

    timeline.appendChild(article);
  });

  return timeline;
}

function renderProjectsSection(section) {
  const container = document.createElement('div');
  container.className = 'projects';

  section.items?.forEach((project) => {
    if (!project?.name) return;

    const article = document.createElement('article');
    article.className = 'project';
    article.setAttribute('tabindex', '0');

    const header = document.createElement('header');
    const nameHeading = document.createElement('h3');
    nameHeading.textContent = project.name;
    header.appendChild(nameHeading);

    if (project.label) {
      const labelSpan = document.createElement('span');
      labelSpan.className = 'project__label';
      labelSpan.textContent = project.label;
      header.appendChild(labelSpan);
    }

    if (project.image?.src) {
      const media = document.createElement('figure');
      media.className = 'project__media';

      const image = document.createElement('img');
      image.className = 'project__image';
      image.src = project.image.src;
      image.alt = project.image.alt || project.name;
      media.appendChild(image);

      if (project.image.caption) {
        const caption = document.createElement('figcaption');
        caption.className = 'project__caption';
        caption.textContent = project.image.caption;
        media.appendChild(caption);
      }

      article.appendChild(media);
    }

    article.appendChild(header);

    if (project.description) {
      const description = document.createElement('p');
      description.textContent = project.description;
      article.appendChild(description);
    }

    if (Array.isArray(project.stack) && project.stack.length > 0) {
      const stackList = document.createElement('ul');
      stackList.className = 'project__stack tech-list';
      project.stack.forEach((tech) => {
        if (!tech) return;
        stackList.appendChild(createTechBadge(tech));
      });
      article.appendChild(stackList);
    }

    if (Array.isArray(project.links) && project.links.length > 0) {
      const linksContainer = document.createElement('div');
      linksContainer.className = 'project__links';
      project.links.forEach((link) => {
        if (!link?.url || !link?.label) return;
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.textContent = link.label;
        if (link.ariaLabel) {
          anchor.setAttribute('aria-label', link.ariaLabel);
        }
        anchor.target = '_blank';
        anchor.rel = 'noreferrer noopener';
        linksContainer.appendChild(anchor);
      });
      article.appendChild(linksContainer);
    }

    container.appendChild(article);
  });

  return container;
}

function renderContactSection(section) {
  const body = document.createElement('div');
  body.className = 'section__body';

  section.paragraphs?.forEach((text) => {
    if (!text) return;
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    body.appendChild(paragraph);
  });

  if (section.cta?.url && section.cta?.label) {
    const button = document.createElement('a');
    button.className = 'button';
    button.href = section.cta.url;
    button.textContent = section.cta.label;
    body.appendChild(button);
  }

  return body;
}

function renderBackToTop(languageData) {
  const button = document.getElementById('back-to-top');
  if (!button) return;

  const action = languageData?.actions?.backToTop || {};
  const label = action.label || 'Back to top';
  const ariaLabel = action.ariaLabel || label;
  const tooltip = action.tooltip || ariaLabel;
  const shortLabel = action.shortLabel || label;

  button.textContent = shortLabel;

  if (ariaLabel) {
    button.setAttribute('aria-label', ariaLabel);
  } else {
    button.removeAttribute('aria-label');
  }

  if (tooltip) {
    button.setAttribute('title', tooltip);
  } else {
    button.removeAttribute('title');
  }

  if (!state.backToTopButton) {
    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      button.blur();
    });
  }

  state.backToTopButton = button;
  button.classList.remove('is-visible');
  updateBackToTopVisibility();
}

function createTechBadge(label) {
  const item = document.createElement('li');
  item.className = 'tech-badge';

  const slug = toSlug(label);
  if (slug) {
    item.dataset.tech = slug;
  }

  const iconPath = slug ? getTechIconPath(slug) : null;
  if (iconPath) {
    const icon = createIconElement(iconPath, 'icon tech-badge__icon');
    item.appendChild(icon);
  }

  const text = document.createElement('span');
  text.textContent = label;
  item.appendChild(text);

  return item;
}

function createIconElement(iconPath, className) {
  const span = document.createElement('span');
  span.className = className;
  span.setAttribute('aria-hidden', 'true');
  span.style.setProperty('--icon-url', `url("${iconPath}")`);
  return span;
}

function toSlug(label) {
  if (!label) return '';
  return label
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function setupSectionObserver() {
  const sections = Array.from(document.querySelectorAll('.section'));
  if (!sections.length) return;

  if (state.sectionObserver) {
    state.sectionObserver.disconnect();
  }

  teardownScrollTracking();

  state.sectionElements = sections;
  state.sectionObserver = new IntersectionObserver(handleSectionIntersect, {
    root: null,
    threshold: [0.35, 0.6, 0.85],
    rootMargin: '-30% 0px -35% 0px',
  });

  sections.forEach((section) => state.sectionObserver.observe(section));
  setupScrollTracking();
}

function handleSectionIntersect(entries) {
  const visibleEntries = entries
    .filter((entry) => entry.isIntersecting || entry.intersectionRatio > 0)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

  if (visibleEntries.length === 0) {
    return;
  }

  const topEntry = visibleEntries[0];
  setActiveSection(topEntry.target.id);
}

function setActiveSection(sectionId, { focus = false, scroll = false } = {}) {
  if (!sectionId) return;

  const section = document.getElementById(sectionId);
  if (!section) return;

  const needsUpdate = state.activeSectionId !== sectionId;
  state.activeSectionId = sectionId;

  if (needsUpdate) {
    document.querySelectorAll('.section.is-active').forEach((node) => {
      if (node.id !== sectionId) {
        node.classList.remove('is-active');
      }
    });

    section.classList.add('is-active');

    state.navigationLinks.forEach((link, id) => {
      if (id === sectionId) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'true');
      } else {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      }
    });
  }

  if (focus && typeof section.focus === 'function') {
    try {
      section.focus({ preventScroll: !scroll });
    } catch (error) {
      section.focus();
    }
  }

  if (scroll) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function handleHashChange() {
  const { hash } = window.location;
  if (!hash) return;

  const sectionId = decodeURIComponent(hash.substring(1));
  setActiveSection(sectionId, { focus: true, scroll: true });
}

function disconnectObserver() {
  if (state.sectionObserver) {
    state.sectionObserver.disconnect();
    state.sectionObserver = null;
  }

  teardownScrollTracking();
  state.sectionElements = [];
}

function setText(id, value = '') {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = value || '';
}

function setupScrollTracking() {
  teardownScrollTracking();

  state.scrollHandler = () => {
    if (state.scrollFrame) return;
    state.scrollFrame = requestAnimationFrame(syncActiveSectionByScroll);
  };

  window.addEventListener('scroll', state.scrollHandler, { passive: true });
  window.addEventListener('resize', state.scrollHandler);
  state.scrollHandler();
}

function teardownScrollTracking() {
  if (state.scrollHandler) {
    window.removeEventListener('scroll', state.scrollHandler);
    window.removeEventListener('resize', state.scrollHandler);
    state.scrollHandler = null;
  }

  if (state.scrollFrame) {
    cancelAnimationFrame(state.scrollFrame);
    state.scrollFrame = null;
  }
}

function syncActiveSectionByScroll() {
  state.scrollFrame = null;

  if (!state.sectionElements.length) return;

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const targetLine = viewportHeight * 0.35;
  let bestSection = null;
  let bestDistance = Infinity;

  state.sectionElements.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.height === 0) return;

    const sectionTop = rect.top;
    const sectionBottom = rect.bottom;
    const isVisible = sectionBottom > viewportHeight * 0.15 && sectionTop < viewportHeight * 0.85;

    if (!isVisible) return;

    const distance = Math.abs(sectionTop - targetLine);
    if (distance < bestDistance) {
      bestSection = section;
      bestDistance = distance;
    }
  });

  if (!bestSection) {
    const firstBelow = state.sectionElements.find((section) => section.getBoundingClientRect().top >= 0);
    bestSection = firstBelow || state.sectionElements[state.sectionElements.length - 1];
  }

  if (bestSection) {
    setActiveSection(bestSection.id);
  }

  updateBackToTopVisibility();
}

function updateBackToTopVisibility() {
  const button = state.backToTopButton || document.getElementById('back-to-top');
  if (!button) return;

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const shouldShow = (window.scrollY || window.pageYOffset || 0) > viewportHeight * 0.5;

  if (shouldShow) {
    button.classList.add('is-visible');
  } else {
    button.classList.remove('is-visible');
  }
}
