export const TECH_ICON_MAP = {
  python: 'assets/icons/python.svg',
  databricks: 'assets/icons/databricks.svg',
  typescript: 'assets/icons/typescript.svg',
  react: 'assets/icons/react.svg',
  'next-js': 'assets/icons/next-js.svg',
  'node-js': 'assets/icons/node-js.svg',
  graphql: 'assets/icons/graphql.svg',
  postgresql: 'assets/icons/postgresql.svg',
  terraform: 'assets/icons/terraform.svg',
  supabase: 'assets/icons/supabase.svg',
  mongodb: 'assets/icons/mongodb.svg',
};

export function getTechIconPath(slug) {
  return TECH_ICON_MAP[slug] || null;
}
