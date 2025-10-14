async function loadResume() {
  try {
    const response = await fetch('resume-data.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`No se pudo cargar el archivo de datos: ${response.status}`);
    }

    const data = await response.json();
    renderSidebar(data);
    renderSections(data.sections);
  } catch (error) {
    console.error('Error al inicializar el CV:', error);
  }
}

function renderSidebar(data) {
  const { identity, contact, lastUpdate } = data;

  setText('sidebar-intro', identity?.intro);
  setText('sidebar-name', identity?.name);
  setText('sidebar-role', identity?.role);
  setText('sidebar-summary', identity?.summary);

  const emailLink = document.getElementById('sidebar-email');
  if (emailLink && contact?.email) {
    emailLink.href = `mailto:${contact.email}`;
    emailLink.textContent = contact.email;
  }

  const linksContainer = document.getElementById('sidebar-links');
  if (linksContainer && Array.isArray(contact?.links)) {
    linksContainer.innerHTML = '';
    contact.links.forEach((link) => {
      if (!link?.url || !link?.label) return;
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.textContent = link.label;
      anchor.rel = 'noreferrer noopener';
      anchor.target = '_blank';
      linksContainer.appendChild(anchor);
    });
  }

  const updateNode = document.getElementById('sidebar-update');
  if (updateNode && lastUpdate) {
    updateNode.textContent = lastUpdate;
  }

  renderNavigation(data.sections);
}

function renderNavigation(sections = []) {
  const navList = document.getElementById('sidebar-nav');
  if (!navList) return;

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
    listItem.appendChild(anchor);
    navList.appendChild(listItem);
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
    skillList.className = 'skills';
    section.skills.forEach((skill) => {
      if (!skill) return;
      const item = document.createElement('li');
      item.textContent = skill;
      skillList.appendChild(item);
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

    article.appendChild(header);

    if (project.description) {
      const description = document.createElement('p');
      description.textContent = project.description;
      article.appendChild(description);
    }

    if (Array.isArray(project.stack) && project.stack.length > 0) {
      const stackList = document.createElement('ul');
      stackList.className = 'project__stack';
      project.stack.forEach((tech) => {
        if (!tech) return;
        const techItem = document.createElement('li');
        techItem.textContent = tech;
        stackList.appendChild(techItem);
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

function setText(id, value) {
  const node = document.getElementById(id);
  if (node && value) {
    node.textContent = value;
  }
}

document.addEventListener('DOMContentLoaded', loadResume);
