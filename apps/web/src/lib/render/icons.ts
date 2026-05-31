import { fab } from '@fortawesome/free-brands-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import * as LucideIcons from 'lucide-react';

type LucideIconNode = [string, Record<string, string>][];
type LucideIconDef = {
    render?: (props: Record<string, never>, ref: null) => { props?: { iconNode?: LucideIconNode } };
};
type FAIconDef = { icon: [number, number, unknown, string, string | string[]] };

function kebabToPascal(name: string): string {
    return name
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');
}

const DEFAULT_FA_SET = fas as Record<string, unknown>;

const FA_SETS: Record<string, Record<string, unknown>> = {
    solid: DEFAULT_FA_SET,
    regular: far as Record<string, unknown>,
    brands: fab as Record<string, unknown>,
};

/**
 * Returns an inline SVG for a Font Awesome icon by kebab-case name.
 * @param name  kebab-case icon name, e.g. "arrow-right"
 * @param set   "solid" (default) | "regular" | "brands"
 */
export function getFAIconSVG(name: string, set = 'solid'): string | null {
    const icons = FA_SETS[set] ?? DEFAULT_FA_SET;
    const key = `fa${kebabToPascal(name)}`;
    const iconDef = icons[key] as FAIconDef | undefined;
    if (!iconDef) return null;

    const [width, height, , , pathData] = iconDef.icon;
    const paths = Array.isArray(pathData) ? pathData : [pathData];
    const pathElements = paths.map((d) => `<path d="${d}" fill="currentColor"/>`).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="1em" height="1em" aria-hidden="true">${pathElements}</svg>`;
}

/**
 * Returns an inline SVG for a Lucide icon by kebab-case name, e.g. "arrow-right".
 * Lucide icons in lucide-react are forwardRef objects — iconNode is extracted by
 * calling the internal render function with empty props.
 */
export function getLucideIconSVG(name: string): string | null {
    const key = kebabToPascal(name);
    const Icon = (LucideIcons as Record<string, unknown>)[key] as LucideIconDef | undefined;
    if (typeof Icon?.render !== 'function') return null;

    const iconNode = Icon.render({}, null).props?.iconNode;
    if (!iconNode) return null;

    const inner = iconNode
        .map(([tag, attrs]) => {
            const attrStr = Object.entries(attrs)
                .filter(([k]) => k !== 'key') // strip React reconciler key
                .map(([k, v]) => `${k}="${v}"`)
                .join(' ');
            return `<${tag} ${attrStr}/>`;
        })
        .join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/**
 * Replace all <img-fa name="..." set="..."> and <img-lucide name="..."> elements
 * in a shadow root with inline SVG icons. Call this after setting innerHTML.
 */
export function resolveIconsInRoot(root: ShadowRoot | Element): void {
    root.querySelectorAll('img-fa[name]').forEach((el) => {
        const svgStr = getFAIconSVG(el.getAttribute('name') ?? '', el.getAttribute('set') ?? 'solid');
        if (svgStr) {
            el.replaceWith(document.createRange().createContextualFragment(svgStr));
        } else {
            el.remove();
        }
    });

    root.querySelectorAll('img-lucide[name]').forEach((el) => {
        const svgStr = getLucideIconSVG(el.getAttribute('name') ?? '');
        if (svgStr) {
            el.replaceWith(document.createRange().createContextualFragment(svgStr));
        } else {
            el.remove();
        }
    });
}
