import routeAliases from '@/lib/route-aliases.json';

export const DEFAULT_PROJECT_ID = 'aurora';

export type RouteAlias = {
  alias: string;
  projectPath: string;
};

export const PROJECT_ROUTE_ALIASES = routeAliases as RouteAlias[];

export function projectHref(projectId: string, projectPath: string): string {
  return `/projects/${projectId}/${projectPath}`;
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (!pathname || !href) return false;
  if (pathname === href) return true;
  if (href !== '/' && pathname.startsWith(`${href}/`)) return true;

  const alias = PROJECT_ROUTE_ALIASES.find((entry) => entry.alias === pathname);
  if (!alias) return false;
  return href === `/${alias.projectPath}` || href.endsWith(`/${alias.projectPath}`);
}
