'use client';

import * as React from 'react';

type RenderState = {
    key: string;
    renderedLayers: Set<string>;
};

export function useRenderReadiness(layerKeys: string[]) {
    const renderKey = React.useMemo(() => layerKeys.join('\u0000'), [layerKeys]);
    const [state, setState] = React.useState<RenderState>(() => ({ key: renderKey, renderedLayers: new Set() }));

    React.useEffect(() => {
        setState({ key: renderKey, renderedLayers: new Set() });
    }, [renderKey]);

    const markLayerRendered = React.useCallback(
        (layerKey: string) => {
            setState((previous) => {
                const renderedLayers =
                    previous.key === renderKey ? new Set(previous.renderedLayers) : new Set<string>();
                if (renderedLayers.has(layerKey)) return previous;
                renderedLayers.add(layerKey);
                return { key: renderKey, renderedLayers };
            });
        },
        [renderKey],
    );

    return {
        rendered: state.key === renderKey && state.renderedLayers.size >= layerKeys.length,
        markLayerRendered,
    };
}
