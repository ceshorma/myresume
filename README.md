# myresume

Este repositorio contiene el CV en formato web de César Hormazabal inspirado en la estructura del portafolio de Brittany Chiang.

## Uso

Abre `index.html` en tu navegador favorito para visualizar la página.

### Editar el contenido

Todo el contenido del CV vive en `resume-data.json`. Modifica ese archivo para actualizar datos personales, experiencia, proyectos u otros textos sin tocar el marcado de `index.html`. La interfaz se alimenta dinámicamente a partir de ese archivo al cargarse la página.

## Despliegue recomendado

Para probar los cambios en un entorno real puedes optar por cualquiera de estas opciones:

### GitHub Pages (rápido para pruebas públicas)
1. Crea un repositorio en GitHub y sube el contenido de este proyecto.
2. En la configuración del repositorio, activa **Pages** usando la rama principal y la carpeta raíz (`/`).
3. Espera a que GitHub genere el sitio y visita la URL que se indica en la sección de Pages.

### Servidor estático temporal (pruebas locales)
1. Desde la carpeta del proyecto ejecuta un servidor HTTP sencillo, por ejemplo:
   ```bash
   python3 -m http.server 5500
   ```
2. Abre tu navegador en `http://localhost:5500` para navegar la versión servida.

### Netlify / Vercel (previsualizaciones rápidas)
1. Crea una cuenta en el servicio de tu preferencia y vincula tu repositorio.
2. Configura el despliegue como un sitio estático (no requiere build).
3. Cada vez que subas cambios a la rama seleccionada el servicio generará una URL de previsualización.

Todas estas alternativas permiten evaluar el comportamiento del CV sin necesidad de un backend adicional.
