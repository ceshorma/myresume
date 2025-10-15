import Ajv from 'https://cdn.jsdelivr.net/npm/ajv@8/dist/ajv7.mjs';
import addFormats from 'https://cdn.jsdelivr.net/npm/ajv-formats@3/dist/ajv-formats.mjs';
import { TECH_ICON_MAP, SOCIAL_ICON_MAP } from '../tech-icons.js';

const DATA_URL = new URL('../resume-data.json', import.meta.url).href;
const SCHEMA_URL = new URL('../schemas/resume.schema.json', import.meta.url).href;

const state = {
  data: null,
  schema: null,
  validator: null,
  currentLanguage: null
};

const elements = {
  defaultLanguageCard: document.getElementById('default-language-card'),
  languageCard: document.getElementById('language-card'),
  identityCard: document.getElementById('identity-card'),
  contactCard: document.getElementById('contact-card'),
  sectionsCard: document.getElementById('sections-card'),
  languageSelector: document.getElementById('language-selector'),
  duplicateLanguageButton: document.getElementById('duplicate-language'),
  deleteLanguageButton: document.getElementById('delete-language'),
  validationStatus: document.getElementById('validation-status'),
  validationErrors: document.getElementById('validation-errors'),
  jsonPreview: document.getElementById('json-preview'),
  copyButton: document.getElementById('copy-json'),
  downloadButton: document.getElementById('download-json'),
  iconReference: document.getElementById('icon-reference')
};

async function init() {
  try {
    const [resumeData, resumeSchema] = await Promise.all([
      fetchJson(DATA_URL),
      fetchJson(SCHEMA_URL)
    ]);

    const ajv = new Ajv({ allErrors: true, strict: true });
    addFormats(ajv);
    const validator = ajv.compile(resumeSchema);

    state.data = resumeData;
    state.schema = resumeSchema;
    state.validator = validator;
    state.currentLanguage = resumeData.defaultLanguage || Object.keys(resumeData.languages)[0];

    renderLanguageSelector();
    renderDefaultLanguageCard();
    renderLanguageCard();
    renderIdentityCard();
    renderContactCard();
    renderSectionsCard();
    renderIconReference();
    runValidation();
    updatePreview();
  } catch (error) {
    console.error(error);
    elements.validationStatus.textContent = error?.message || 'No se pudo cargar los datos.';
    elements.validationStatus.className = 'status status--error';
    elements.validationErrors.innerHTML = '';
    return;
  }
}

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

// Event bindings

elements.languageSelector.addEventListener('change', (event) => {
  state.currentLanguage = event.target.value;
  renderLanguageCard();
  renderIdentityCard();
  renderContactCard();
  renderSectionsCard();
});

elements.duplicateLanguageButton.addEventListener('click', () => {
  const code = prompt('Introduce el código del nuevo idioma (ej. fr, it, en-GB):');
  if (!code) {
    return;
  }
  const trimmed = code.trim();
  if (!trimmed) {
    return;
  }
  if (state.data.languages[trimmed]) {
    alert('Ese código ya existe. Elige otro.');
    return;
  }
  const base = structuredClone(state.data.languages[state.currentLanguage]);
  base.language.code = trimmed;
  base.language.label = base.language.label + ' (copia)';
  base.language.shortLabel = trimmed.toUpperCase().slice(0, 3);
  state.data.languages[trimmed] = base;
  state.currentLanguage = trimmed;
  if (!state.data.defaultLanguage) {
    state.data.defaultLanguage = trimmed;
  }
  renderLanguageSelector();
  renderDefaultLanguageCard();
  renderLanguageCard();
  renderIdentityCard();
  renderContactCard();
  renderSectionsCard();
  runValidation();
  updatePreview();
});

elements.deleteLanguageButton.addEventListener('click', () => {
  const languageKeys = Object.keys(state.data.languages);
  if (languageKeys.length <= 1) {
    alert('Debe existir al menos un idioma.');
    return;
  }
  const confirmation = confirm(`¿Eliminar el idioma ${state.currentLanguage}? Esta acción no se puede deshacer.`);
  if (!confirmation) {
    return;
  }
  delete state.data.languages[state.currentLanguage];
  const remaining = Object.keys(state.data.languages);
  const nextCode = remaining.includes(state.data.defaultLanguage)
    ? state.data.defaultLanguage
    : remaining[0];
  if (!remaining.includes(state.data.defaultLanguage)) {
    state.data.defaultLanguage = nextCode;
  }
  state.currentLanguage = nextCode;
  renderLanguageSelector();
  renderDefaultLanguageCard();
  renderLanguageCard();
  renderIdentityCard();
  renderContactCard();
  renderSectionsCard();
  runValidation();
  updatePreview();
});

elements.copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(state.data, null, 2));
    elements.copyButton.textContent = '¡Copiado!';
    setTimeout(() => {
      elements.copyButton.textContent = 'Copiar al portapapeles';
    }, 2500);
  } catch (error) {
    console.error(error);
    alert('No se pudo copiar al portapapeles. Copia manualmente el JSON.');
  }
});

elements.downloadButton.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'resume-data.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
});

function renderLanguageSelector() {
  elements.languageSelector.innerHTML = '';
  const codes = Object.keys(state.data.languages);
  codes.forEach((code) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${code} · ${state.data.languages[code].language.label}`;
    elements.languageSelector.appendChild(option);
  });
  if (!codes.includes(state.currentLanguage)) {
    state.currentLanguage = codes[0];
  }
  elements.languageSelector.value = state.currentLanguage;
  elements.deleteLanguageButton.disabled = codes.length <= 1;
}

function renderDefaultLanguageCard() {
  const card = elements.defaultLanguageCard;
  clearElement(card);
  const title = document.createElement('h2');
  title.textContent = 'Idioma por defecto';
  card.appendChild(title);

  const selectField = createField('Código', ['defaultLanguage'], {
    choices: Object.keys(state.data.languages).map((code) => ({ value: code, label: code }))
  });
  card.appendChild(selectField);

  const helper = document.createElement('p');
  helper.className = 'helper-text';
  helper.textContent = 'Define qué idioma se carga inicialmente cuando alguien visita el CV.';
  card.appendChild(helper);
}

function renderLanguageCard() {
  const card = elements.languageCard;
  clearElement(card);
  const title = document.createElement('h2');
  title.textContent = 'Metadatos del idioma';
  card.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'group group--columns';
  grid.appendChild(createField('Código', pathFor('language', 'code'), { readonly: true }));
  grid.appendChild(createField('Etiqueta', pathFor('language', 'label')));
  grid.appendChild(createField('Etiqueta corta', pathFor('language', 'shortLabel')));
  grid.appendChild(createField('Locale', pathFor('locale')));
  card.appendChild(grid);

  card.appendChild(createField('Título para SEO', pathFor('metaTitle')));

  const helper = document.createElement('p');
  helper.className = 'helper-text';
  helper.textContent = 'Para cambiar el código, duplica el idioma y edita sus textos.';
  card.appendChild(helper);

  // Ensure the disabled field reflects the key
  const codeInput = card.querySelector('input[readonly]');
  if (codeInput) {
    codeInput.value = state.currentLanguage;
  }
}

function renderIdentityCard() {
  const card = elements.identityCard;
  clearElement(card);
  const title = document.createElement('h2');
  title.textContent = 'Identidad';
  card.appendChild(title);

  card.appendChild(createField('Introducción', pathFor('identity', 'intro')));
  card.appendChild(createField('Nombre', pathFor('identity', 'name')));
  card.appendChild(createField('Rol', pathFor('identity', 'role')));
  card.appendChild(
    createField('Resumen', pathFor('identity', 'summary'), {
      multiline: true,
      rows: 4
    })
  );
}

function renderContactCard() {
  const card = elements.contactCard;
  clearElement(card);
  const title = document.createElement('h2');
  title.textContent = 'Contacto';
  card.appendChild(title);

  card.appendChild(createField('Email', pathFor('contact', 'email'), { type: 'email' }));

  const download = getValueAtPath(pathFor('contact', 'download'));
  const downloadWrapper = document.createElement('div');
  downloadWrapper.className = 'group group--columns';

  if (download) {
    downloadWrapper.appendChild(createField('Etiqueta del botón', pathFor('contact', 'download', 'label')));
    downloadWrapper.appendChild(createField('Aria label', pathFor('contact', 'download', 'ariaLabel')));
    downloadWrapper.appendChild(createField('Tooltip', pathFor('contact', 'download', 'tooltip')));
    downloadWrapper.appendChild(createField('URL', pathFor('contact', 'download', 'url')));
    downloadWrapper.appendChild(createField('Nombre del archivo', pathFor('contact', 'download', 'filename')));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'button button--ghost';
    removeButton.textContent = 'Quitar botón de descarga';
    removeButton.addEventListener('click', () => {
      deletePropertyAtPath(pathFor('contact', 'download'));
      renderContactCard();
      runValidation();
      updatePreview();
    });
    const actions = document.createElement('div');
    actions.className = 'export-actions';
    actions.appendChild(removeButton);
    card.appendChild(actions);
  } else {
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'button button--secondary';
    addButton.textContent = 'Añadir botón de descarga';
    addButton.addEventListener('click', () => {
      setValueAtPath(state.data, pathFor('contact', 'download'), {
        label: '',
        ariaLabel: '',
        tooltip: '',
        url: '',
        filename: ''
      });
      renderContactCard();
      runValidation();
      updatePreview();
    });
    card.appendChild(addButton);
  }

  if (download) {
    card.appendChild(downloadWrapper);
  }

  const linksEditor = createContactLinksEditor(pathFor('contact', 'links'));
  card.appendChild(linksEditor);
}

function renderSectionsCard() {
  const card = elements.sectionsCard;
  clearElement(card);
  const title = document.createElement('h2');
  title.textContent = 'Secciones';
  card.appendChild(title);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'button button--secondary';
  addButton.textContent = 'Añadir sección';
  addButton.addEventListener('click', () => {
    const type = prompt('Tipo de sección (about, timeline, projects, contact):');
    if (!type) {
      return;
    }
    const normalized = type.trim().toLowerCase();
    if (!['about', 'timeline', 'projects', 'contact'].includes(normalized)) {
      alert('Tipo de sección no válido. Usa about, timeline, projects o contact.');
      return;
    }
    const sections = ensureArrayAtPath(pathFor('sections'));
    sections.push(createSectionTemplate(normalized, sections.length));
    renderSectionsCard();
    runValidation();
    updatePreview();
  });
  card.appendChild(addButton);

  const sections = getValueAtPath(pathFor('sections')) || [];
  if (!sections.length) {
    const empty = document.createElement('p');
    empty.className = 'helper-text';
    empty.textContent = 'Todavía no hay secciones para este idioma.';
    card.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'array-editor__items';

  sections.forEach((section, index) => {
    list.appendChild(createSectionEditor(section, index));
  });

  card.appendChild(list);
}

function renderIconReference() {
  clearElement(elements.iconReference);
  const socialEntries = Object.entries(SOCIAL_ICON_MAP).map(([slug, path]) => ({
    slug,
    path,
    category: 'Social'
  }));
  const techEntries = Object.entries(TECH_ICON_MAP).map(([slug, path]) => ({
    slug,
    path,
    category: 'Tech'
  }));

  [...socialEntries, ...techEntries].forEach(({ slug, path, category }) => {
    const item = document.createElement('div');
    item.className = 'icon-list__item';
    const image = document.createElement('img');
    image.src = `../${path}`;
    image.alt = slug;
    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = slug;
    const caption = document.createElement('span');
    caption.textContent = category;
    caption.style.color = 'var(--text-muted)';
    caption.style.fontSize = '0.8rem';
    text.appendChild(title);
    text.appendChild(caption);
    item.appendChild(image);
    item.appendChild(text);
    elements.iconReference.appendChild(item);
  });
}

function createSectionEditor(section, index) {
  const container = document.createElement('div');
  container.className = 'array-item';

  const header = document.createElement('div');
  header.className = 'array-item__header';
  const title = document.createElement('strong');
  title.textContent = `${section.number} · ${section.title}`;
  header.appendChild(title);

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'button button--ghost';
  removeButton.textContent = 'Eliminar sección';
  removeButton.addEventListener('click', () => {
    const sections = ensureArrayAtPath(pathFor('sections'));
    sections.splice(index, 1);
    renderSectionsCard();
    runValidation();
    updatePreview();
  });
  header.appendChild(removeButton);
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'group group--columns';
  grid.appendChild(createField('Identificador', pathFor('sections', index, 'id')));
  grid.appendChild(createField('Número', pathFor('sections', index, 'number')));
  grid.appendChild(createField('Título', pathFor('sections', index, 'title')));
  grid.appendChild(createField('Etiqueta de navegación', pathFor('sections', index, 'navLabel')));
  container.appendChild(grid);

  const typeInfo = document.createElement('p');
  typeInfo.className = 'helper-text';
  typeInfo.textContent = `Tipo de sección: ${section.type}`;
  container.appendChild(typeInfo);

  if (section.type === 'about') {
    container.appendChild(
      createStringArrayEditor(pathFor('sections', index, 'paragraphs'), {
        title: 'Párrafos',
        addLabel: 'Añadir párrafo',
        multiline: true,
        itemLabel: 'Párrafo',
        onChange: () => {
          renderSectionsCard();
          runValidation();
          updatePreview();
        }
      })
    );
    container.appendChild(
      createStringArrayEditor(pathFor('sections', index, 'skills'), {
        title: 'Habilidades destacadas',
        addLabel: 'Añadir habilidad',
        itemLabel: 'Habilidad',
        onChange: () => {
          renderSectionsCard();
          runValidation();
          updatePreview();
        }
      })
    );
  }

  if (section.type === 'timeline') {
    container.appendChild(createTimelineEditor(index));
  }

  if (section.type === 'projects') {
    container.appendChild(createProjectsEditor(index));
  }

  if (section.type === 'contact') {
    container.appendChild(
      createStringArrayEditor(pathFor('sections', index, 'paragraphs'), {
        title: 'Párrafos',
        addLabel: 'Añadir párrafo',
        multiline: true,
        itemLabel: 'Párrafo',
        onChange: () => {
          renderSectionsCard();
          runValidation();
          updatePreview();
        }
      })
    );
    container.appendChild(createCtaEditor(index));
  }

  return container;
}

function createTimelineEditor(sectionIndex) {
  const path = pathFor('sections', sectionIndex, 'items');
  const container = document.createElement('div');
  container.className = 'array-editor';

  const header = document.createElement('div');
  header.className = 'array-editor__header';
  const title = document.createElement('span');
  title.className = 'array-editor__title';
  title.textContent = 'Experiencia';
  header.appendChild(title);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'button button--secondary';
  addButton.textContent = 'Añadir rol';
  addButton.addEventListener('click', () => {
    const items = ensureArrayAtPath(path);
    items.push({
      role: '',
      period: '',
      achievements: ['']
    });
    renderSectionsCard();
    runValidation();
    updatePreview();
  });
  header.appendChild(addButton);
  container.appendChild(header);

  const itemsWrapper = document.createElement('div');
  itemsWrapper.className = 'array-editor__items';

  (getValueAtPath(path) || []).forEach((item, index) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'array-item';

    const itemHeader = document.createElement('div');
    itemHeader.className = 'array-item__header';
    const heading = document.createElement('strong');
    heading.textContent = `Rol ${index + 1}`;
    itemHeader.appendChild(heading);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button button--ghost';
    remove.textContent = 'Eliminar';
    remove.addEventListener('click', () => {
      const items = ensureArrayAtPath(path);
      items.splice(index, 1);
      renderSectionsCard();
      runValidation();
      updatePreview();
    });
    itemHeader.appendChild(remove);
    itemCard.appendChild(itemHeader);

    itemCard.appendChild(createField('Rol', pathFor('sections', sectionIndex, 'items', index, 'role')));
    itemCard.appendChild(createField('Periodo', pathFor('sections', sectionIndex, 'items', index, 'period')));
    itemCard.appendChild(
      createStringArrayEditor(pathFor('sections', sectionIndex, 'items', index, 'achievements'), {
        title: 'Logros',
        addLabel: 'Añadir logro',
        multiline: true,
        itemLabel: 'Logro',
        onChange: () => {
          renderSectionsCard();
          runValidation();
          updatePreview();
        }
      })
    );

    itemsWrapper.appendChild(itemCard);
  });

  container.appendChild(itemsWrapper);
  return container;
}

function createProjectsEditor(sectionIndex) {
  const path = pathFor('sections', sectionIndex, 'items');
  const container = document.createElement('div');
  container.className = 'array-editor';

  const header = document.createElement('div');
  header.className = 'array-editor__header';
  const title = document.createElement('span');
  title.className = 'array-editor__title';
  title.textContent = 'Proyectos';
  header.appendChild(title);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'button button--secondary';
  addButton.textContent = 'Añadir proyecto';
  addButton.addEventListener('click', () => {
    const items = ensureArrayAtPath(path);
    items.push({
      name: '',
      label: '',
      description: '',
      stack: [''],
      links: [],
      image: { src: '', alt: '' }
    });
    renderSectionsCard();
    runValidation();
    updatePreview();
  });
  header.appendChild(addButton);
  container.appendChild(header);

  const itemsWrapper = document.createElement('div');
  itemsWrapper.className = 'array-editor__items';

  (getValueAtPath(path) || []).forEach((project, index) => {
    const card = document.createElement('div');
    card.className = 'array-item';

    const itemHeader = document.createElement('div');
    itemHeader.className = 'array-item__header';
    const heading = document.createElement('strong');
    heading.textContent = `Proyecto ${index + 1}`;
    itemHeader.appendChild(heading);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button button--ghost';
    remove.textContent = 'Eliminar';
    remove.addEventListener('click', () => {
      const items = ensureArrayAtPath(path);
      items.splice(index, 1);
      renderSectionsCard();
      runValidation();
      updatePreview();
    });
    itemHeader.appendChild(remove);
    card.appendChild(itemHeader);

    card.appendChild(createField('Nombre', pathFor('sections', sectionIndex, 'items', index, 'name')));
    card.appendChild(createField('Etiqueta corta', pathFor('sections', sectionIndex, 'items', index, 'label')));
    card.appendChild(
      createField('Descripción', pathFor('sections', sectionIndex, 'items', index, 'description'), {
        multiline: true,
        rows: 4
      })
    );

    card.appendChild(
      createStringArrayEditor(pathFor('sections', sectionIndex, 'items', index, 'stack'), {
        title: 'Stack',
        addLabel: 'Añadir tecnología',
        itemLabel: 'Tecnología',
        onChange: () => {
          renderSectionsCard();
          runValidation();
          updatePreview();
        }
      })
    );

    card.appendChild(createProjectLinksEditor(sectionIndex, index));
    card.appendChild(createProjectImageEditor(sectionIndex, index));

    itemsWrapper.appendChild(card);
  });

  container.appendChild(itemsWrapper);
  return container;
}

function createProjectLinksEditor(sectionIndex, projectIndex) {
  const path = pathFor('sections', sectionIndex, 'items', projectIndex, 'links');
  const container = document.createElement('div');
  container.className = 'array-editor';

  const header = document.createElement('div');
  header.className = 'array-editor__header';
  const title = document.createElement('span');
  title.className = 'array-editor__title';
  title.textContent = 'Enlaces del proyecto';
  header.appendChild(title);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'button button--secondary';
  addButton.textContent = 'Añadir enlace';
  addButton.addEventListener('click', () => {
    const items = ensureArrayAtPath(path);
    items.push({ label: '', url: '', ariaLabel: '' });
    renderSectionsCard();
    runValidation();
    updatePreview();
  });
  header.appendChild(addButton);
  container.appendChild(header);

  const itemsWrapper = document.createElement('div');
  itemsWrapper.className = 'array-editor__items';

  (getValueAtPath(path) || []).forEach((link, index) => {
    const card = document.createElement('div');
    card.className = 'array-item';

    const itemHeader = document.createElement('div');
    itemHeader.className = 'array-item__header';
    const heading = document.createElement('strong');
    heading.textContent = `Enlace ${index + 1}`;
    itemHeader.appendChild(heading);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button button--ghost';
    remove.textContent = 'Eliminar';
    remove.addEventListener('click', () => {
      const items = ensureArrayAtPath(path);
      items.splice(index, 1);
      renderSectionsCard();
      runValidation();
      updatePreview();
    });
    itemHeader.appendChild(remove);
    card.appendChild(itemHeader);

    card.appendChild(createField('Etiqueta', pathFor('sections', sectionIndex, 'items', projectIndex, 'links', index, 'label')));
    card.appendChild(createField('URL', pathFor('sections', sectionIndex, 'items', projectIndex, 'links', index, 'url')));
    card.appendChild(
      createField('Aria label', pathFor('sections', sectionIndex, 'items', projectIndex, 'links', index, 'ariaLabel'), {
        optional: true
      })
    );

    itemsWrapper.appendChild(card);
  });

  container.appendChild(itemsWrapper);
  return container;
}

function createProjectImageEditor(sectionIndex, projectIndex) {
  const path = pathFor('sections', sectionIndex, 'items', projectIndex, 'image');
  const image = getValueAtPath(path);
  const container = document.createElement('div');
  container.className = 'array-editor';

  const header = document.createElement('div');
  header.className = 'array-editor__header';
  const title = document.createElement('span');
  title.className = 'array-editor__title';
  title.textContent = 'Imagen';
  header.appendChild(title);

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = image ? 'button button--ghost' : 'button button--secondary';
  toggleButton.textContent = image ? 'Quitar imagen' : 'Añadir imagen';
  toggleButton.addEventListener('click', () => {
    if (getValueAtPath(path)) {
      deletePropertyAtPath(path);
    } else {
      setValueAtPath(state.data, path, { src: '', alt: '' });
    }
    renderSectionsCard();
    runValidation();
    updatePreview();
  });
  header.appendChild(toggleButton);
  container.appendChild(header);

  if (!image) {
    const helper = document.createElement('p');
    helper.className = 'helper-text';
    helper.textContent = 'Añade una imagen para mostrar una vista previa del proyecto.';
    container.appendChild(helper);
    return container;
  }

  const grid = document.createElement('div');
  grid.className = 'group group--columns';
  grid.appendChild(createField('Ruta (src)', pathFor('sections', sectionIndex, 'items', projectIndex, 'image', 'src')));
  grid.appendChild(createField('Texto alternativo', pathFor('sections', sectionIndex, 'items', projectIndex, 'image', 'alt')));
  grid.appendChild(
    createField('Pie de imagen', pathFor('sections', sectionIndex, 'items', projectIndex, 'image', 'caption'), {
      optional: true
    })
  );
  container.appendChild(grid);
  return container;
}

function createCtaEditor(sectionIndex) {
  const path = pathFor('sections', sectionIndex, 'cta');
  const cta = getValueAtPath(path);
  const container = document.createElement('div');
  container.className = 'array-editor';

  const header = document.createElement('div');
  header.className = 'array-editor__header';
  const title = document.createElement('span');
  title.className = 'array-editor__title';
  title.textContent = 'Llamado a la acción';
  header.appendChild(title);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = cta ? 'button button--ghost' : 'button button--secondary';
  toggle.textContent = cta ? 'Quitar CTA' : 'Añadir CTA';
  toggle.addEventListener('click', () => {
    if (getValueAtPath(path)) {
      deletePropertyAtPath(path);
    } else {
      setValueAtPath(state.data, path, { label: '', url: '' });
    }
    renderSectionsCard();
    runValidation();
    updatePreview();
  });
  header.appendChild(toggle);
  container.appendChild(header);

  if (!cta) {
    const helper = document.createElement('p');
    helper.className = 'helper-text';
    helper.textContent = 'Agrega una acción si quieres mostrar un botón de contacto.';
    container.appendChild(helper);
    return container;
  }

  container.appendChild(createField('Etiqueta', pathFor('sections', sectionIndex, 'cta', 'label')));
  container.appendChild(createField('URL', pathFor('sections', sectionIndex, 'cta', 'url')));
  return container;
}

function createContactLinksEditor(path) {
  const container = document.createElement('div');
  container.className = 'array-editor';

  const header = document.createElement('div');
  header.className = 'array-editor__header';
  const title = document.createElement('span');
  title.className = 'array-editor__title';
  title.textContent = 'Enlaces de contacto';
  header.appendChild(title);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'button button--secondary';
  addButton.textContent = 'Añadir enlace';
  addButton.addEventListener('click', () => {
    const links = ensureArrayAtPath(path);
    links.push({ label: '', url: '', ariaLabel: '' });
    renderContactCard();
    runValidation();
    updatePreview();
  });
  header.appendChild(addButton);
  container.appendChild(header);

  const list = document.createElement('div');
  list.className = 'array-editor__items';
  (getValueAtPath(path) || []).forEach((link, index) => {
    const item = document.createElement('div');
    item.className = 'array-item';

    const itemHeader = document.createElement('div');
    itemHeader.className = 'array-item__header';
    const heading = document.createElement('strong');
    heading.textContent = `Enlace ${index + 1}`;
    itemHeader.appendChild(heading);
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'button button--ghost';
    removeButton.textContent = 'Eliminar';
    removeButton.addEventListener('click', () => {
      const links = ensureArrayAtPath(path);
      links.splice(index, 1);
      renderContactCard();
      runValidation();
      updatePreview();
    });
    itemHeader.appendChild(removeButton);
    item.appendChild(itemHeader);

    item.appendChild(createField('Etiqueta', [...path, index, 'label']));
    item.appendChild(createField('URL', [...path, index, 'url']));
    item.appendChild(createField('Aria label', [...path, index, 'ariaLabel'], { optional: true }));
    item.appendChild(
      createField('Icono', [...path, index, 'icon'], {
        choices: [{ value: '', label: 'Sin icono' }, ...Object.keys(SOCIAL_ICON_MAP).map((slug) => ({ value: slug, label: slug }))],
        optional: true
      })
    );

    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}

function createStringArrayEditor(path, options) {
  const { title, addLabel, multiline = false, itemLabel = 'Elemento', onChange, rows } = options;
  const container = document.createElement('div');
  container.className = 'array-editor';

  const header = document.createElement('div');
  header.className = 'array-editor__header';
  const heading = document.createElement('span');
  heading.className = 'array-editor__title';
  heading.textContent = title;
  header.appendChild(heading);

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'button button--secondary';
  addButton.textContent = addLabel || 'Añadir';
  addButton.addEventListener('click', () => {
    const items = ensureArrayAtPath(path);
    items.push('');
    if (onChange) {
      onChange();
    } else {
      runValidation();
      updatePreview();
    }
  });
  header.appendChild(addButton);
  container.appendChild(header);

  const list = document.createElement('div');
  list.className = 'array-editor__items';
  (getValueAtPath(path) || []).forEach((value, index) => {
    const item = document.createElement('div');
    item.className = 'array-item';
    const itemHeader = document.createElement('div');
    itemHeader.className = 'array-item__header';
    const titleEl = document.createElement('strong');
    titleEl.textContent = `${itemLabel} ${index + 1}`;
    itemHeader.appendChild(titleEl);
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'button button--ghost';
    removeButton.textContent = 'Eliminar';
    removeButton.addEventListener('click', () => {
      const items = ensureArrayAtPath(path);
      items.splice(index, 1);
      if (onChange) {
        onChange();
      } else {
        runValidation();
        updatePreview();
      }
    });
    itemHeader.appendChild(removeButton);
    item.appendChild(itemHeader);

    item.appendChild(
      createField(itemLabel, [...path, index], {
        multiline,
        rows
      })
    );
    list.appendChild(item);
  });

  container.appendChild(list);
  return container;
}

function createField(label, path, options = {}) {
  const { type = 'text', multiline = false, rows, choices, readonly = false, optional = false } = options;
  const wrapper = document.createElement('label');
  wrapper.className = 'field';

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  let input;
  if (choices && Array.isArray(choices)) {
    input = document.createElement('select');
    choices.forEach(({ value, label: optionLabel }) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = optionLabel;
      input.appendChild(option);
    });
    input.addEventListener('change', handleInputChange);
  } else if (multiline) {
    input = document.createElement('textarea');
    input.addEventListener('input', handleInputChange);
    if (rows) {
      input.rows = rows;
    }
  } else {
    input = document.createElement('input');
    input.type = type;
    input.addEventListener('input', handleInputChange);
  }

  if (readonly) {
    input.readOnly = true;
    input.tabIndex = -1;
  }

  if (optional) {
    input.dataset.optional = 'true';
  }

  input.dataset.path = JSON.stringify(path);
  const value = getValueAtPath(path);
  if (value !== undefined && value !== null) {
    input.value = value;
  } else if (choices) {
    input.value = '';
  }

  wrapper.appendChild(input);
  return wrapper;
}

function handleInputChange(event) {
  const target = event.target;
  const path = JSON.parse(target.dataset.path);
  let value = target.value;

  if (target.type === 'number') {
    value = target.value === '' ? '' : Number(target.value);
  }

  if (target.dataset.optional === 'true' && value.trim() === '') {
    deletePropertyAtPath(path);
  } else {
    setValueAtPath(state.data, path, value);
  }

  if (path.length === 1 && path[0] === 'defaultLanguage') {
    renderLanguageSelector();
  }

  runValidation();
  updatePreview();
}

function runValidation() {
  if (!state.validator || !state.data) {
    return;
  }

  const valid = state.validator(state.data);
  if (valid) {
    elements.validationStatus.textContent = 'El JSON cumple con el schema.';
    elements.validationStatus.className = 'status status--success';
    elements.validationErrors.innerHTML = '';
  } else {
    elements.validationStatus.textContent = 'Hay errores que debes corregir.';
    elements.validationStatus.className = 'status status--error';
    elements.validationErrors.innerHTML = '';
    state.validator.errors.forEach((error) => {
      const item = document.createElement('li');
      const path = error.instancePath || '/';
      item.textContent = `${path}: ${error.message}`;
      elements.validationErrors.appendChild(item);
    });
  }
}

function updatePreview() {
  if (!state.data) {
    elements.jsonPreview.value = '';
    return;
  }

  elements.jsonPreview.value = JSON.stringify(state.data, null, 2);
}

function pathFor(...segments) {
  return ['languages', state.currentLanguage, ...segments];
}

function getValueAtPath(path) {
  return path.reduce((acc, key) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }
    return acc[key];
  }, state.data);
}

function setValueAtPath(root, path, value) {
  let target = root;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (target[key] === undefined) {
      target[key] = typeof path[i + 1] === 'number' ? [] : {};
    }
    target = target[key];
  }
  target[path[path.length - 1]] = value;
}

function deletePropertyAtPath(path) {
  let target = state.data;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (target[key] === undefined) {
      return;
    }
    target = target[key];
  }
  if (target && typeof target === 'object') {
    delete target[path[path.length - 1]];
  }
}

function ensureArrayAtPath(path) {
  let value = getValueAtPath(path);
  if (!Array.isArray(value)) {
    setValueAtPath(state.data, path, []);
    value = getValueAtPath(path);
  }
  return value;
}

function createSectionTemplate(type, index) {
  const number = String(index + 1).padStart(2, '0');
  const base = {
    id: `${type}-${Date.now()}`,
    number,
    title: `Nueva sección (${type})`,
    navLabel: `Nueva sección`,
    type
  };

  if (type === 'about') {
    base.paragraphs = [''];
    base.skills = [''];
  }

  if (type === 'timeline') {
    base.items = [
      {
        role: '',
        period: '',
        achievements: ['']
      }
    ];
  }

  if (type === 'projects') {
    base.items = [
      {
        name: '',
        label: '',
        description: '',
        stack: [''],
        links: [],
        image: { src: '', alt: '' }
      }
    ];
  }

  if (type === 'contact') {
    base.paragraphs = [''];
    base.cta = { label: '', url: '' };
  }

  return base;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${url}`);
  }
  return response.json();
}

init();
