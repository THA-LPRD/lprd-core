import { useEffect } from 'react';

/**
 * Hides the Next.js dev tools indicator by polling for the `nextjs-portal` element.
 * Used on render pages where the indicator would interfere with screenshots.
 */
export function useHideDevIndicator() {
    useEffect(() => {
        const hideIndicator = () => {
            const indicator = document.querySelector('nextjs-portal');
            if (indicator) {
                (indicator as HTMLElement).style.display = 'none';
            }
        };

        hideIndicator();
        const interval = setInterval(hideIndicator, 100);

        return () => clearInterval(interval);
    }, []);
}
