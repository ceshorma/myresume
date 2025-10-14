# Guidelines for `myresume`

- Mantén el contenido del CV separado de la capa de presentación. Utiliza `resume-data.json` para textos, enlaces y metadatos; cualquier actualización de contenido debe realizarse ahí.
- Los colores, tipografías y otros *tokens* de diseño deben declararse en `design-tokens.css`. Reusa las variables existentes o añade nuevas en ese archivo en lugar de hardcodear valores en `styles.css` u otros estilos.
- El proyecto debe seguir siendo compatible con GitHub Pages: evita dependencias de *build*, servidores o herramientas que requieran ejecución en el backend. Trabaja únicamente con HTML, CSS y JavaScript estáticos.
