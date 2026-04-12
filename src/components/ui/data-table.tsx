'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type DataTableContextValue = {
    rows: unknown[];
    getRowKey: (row: unknown) => string;
    expandedId: string | null;
    toggleExpanded: (id: string) => void;
};

const DataTableContext = React.createContext<DataTableContextValue | null>(null);

function useDataTableContext() {
    const ctx = React.useContext(DataTableContext);
    if (!ctx) throw new Error('Must be used inside <DataTable>');
    return ctx;
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

function DataTable<T>({
    rows,
    getRowKey,
    paginationStatus,
    onLoadMore,
    emptyTitle = 'No items',
    emptyDescription,
    className,
    children,
}: {
    rows: T[];
    getRowKey: (row: T) => string;
    paginationStatus?: 'LoadingFirstPage' | 'LoadingMore' | 'CanLoadMore' | 'Exhausted';
    onLoadMore?: () => void;
    emptyTitle?: string;
    emptyDescription?: string;
    className?: string;
    children: React.ReactNode;
}) {
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    const toggleExpanded = React.useCallback((id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
    }, []);

    const ctx = React.useMemo<DataTableContextValue>(
        () => ({
            rows: rows as unknown[],
            getRowKey: getRowKey as (row: unknown) => string,
            expandedId,
            toggleExpanded,
        }),
        [rows, getRowKey, expandedId, toggleExpanded],
    );

    const isEmpty = rows.length === 0;
    const isLoading = paginationStatus === 'LoadingFirstPage';

    return (
        <DataTableContext.Provider value={ctx}>
            <div
                className={cn(
                    'flex min-w-0 max-w-full max-h-[calc(100vh-14rem)] flex-col overflow-hidden rounded-lg border',
                    className,
                )}
            >
                <ScrollArea className="min-w-0 min-h-0 flex-1">
                    {isEmpty ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            {isLoading ? (
                                <p className="text-sm text-muted-foreground">Loading…</p>
                            ) : (
                                <>
                                    <p className="text-sm font-medium">{emptyTitle}</p>
                                    {emptyDescription && (
                                        <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <table className="w-max min-w-full text-sm">{children}</table>
                    )}
                    {paginationStatus === 'CanLoadMore' && onLoadMore && (
                        <div className="flex justify-center border-t p-3">
                            <Button variant="ghost" size="sm" onClick={onLoadMore}>
                                Load more
                            </Button>
                        </div>
                    )}
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        </DataTableContext.Provider>
    );
}

// ---------------------------------------------------------------------------
// DataTableHeader — sticky thead with muted column labels
// ---------------------------------------------------------------------------

function DataTableHeader({ className, ...props }: React.ComponentProps<typeof TableHeader>) {
    return (
        <TableHeader
            className={cn('sticky top-0 z-10 bg-background [&_th]:text-muted-foreground', className)}
            {...props}
        />
    );
}

// ---------------------------------------------------------------------------
// DataTableChevronHead — placeholder <th> for the expand chevron column.
// Add to your <TableRow> inside <DataTableHeader> whenever you use
// <DataTableDetail>.
// ---------------------------------------------------------------------------

function DataTableChevronHead({ className }: { className?: string }) {
    return <TableHead className={cn('w-10 px-2', className)} />;
}

// ---------------------------------------------------------------------------
// DataTableRow / DataTableDetail — marker components scanned by DataTableBody.
// They render nothing; DataTableBody reads their children render functions.
// ---------------------------------------------------------------------------

function DataTableRow<T = unknown>({ children }: { children: (row: T) => React.ReactNode }) {
    void children;
    return null;
}
DataTableRow.displayName = 'DataTableRow';

function DataTableDetail<T = unknown>({ children }: { children: (row: T) => React.ReactNode }) {
    void children;
    return null;
}
DataTableDetail.displayName = 'DataTableDetail';

// ---------------------------------------------------------------------------
// DataTableBody — iterates rows from context, handles expand state
// ---------------------------------------------------------------------------

function DataTableBody({ children }: { children: React.ReactNode }) {
    const { rows, getRowKey, expandedId, toggleExpanded } = useDataTableContext();

    let rowRenderer: ((row: unknown) => React.ReactNode) | undefined;
    let detailRenderer: ((row: unknown) => React.ReactNode) | undefined;

    React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
            if (child.type === DataTableRow) {
                rowRenderer = (child.props as { children: (row: unknown) => React.ReactNode }).children;
            } else if (child.type === DataTableDetail) {
                detailRenderer = (child.props as { children: (row: unknown) => React.ReactNode }).children;
            }
        }
    });

    return (
        <TableBody>
            {rows.map((row) => {
                const key = getRowKey(row);
                const isExpanded = expandedId === key;

                return (
                    <React.Fragment key={key}>
                        <TableRow
                            className={cn(detailRenderer && 'cursor-pointer')}
                            tabIndex={detailRenderer ? 0 : undefined}
                            onClick={detailRenderer ? () => toggleExpanded(key) : undefined}
                            onKeyDown={
                                detailRenderer
                                    ? (e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              toggleExpanded(key);
                                          }
                                      }
                                    : undefined
                            }
                        >
                            {detailRenderer && (
                                <td className="w-10 px-2 py-3 text-muted-foreground/50">
                                    {isExpanded ? (
                                        <ChevronDown className="size-3.5" />
                                    ) : (
                                        <ChevronRight className="size-3.5" />
                                    )}
                                </td>
                            )}
                            {rowRenderer?.(row)}
                        </TableRow>
                        {isExpanded && detailRenderer && (
                            <tr className="border-b bg-muted/30">
                                <td colSpan={100} className="p-0">
                                    {detailRenderer(row)}
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                );
            })}
        </TableBody>
    );
}

export { DataTable, DataTableHeader, DataTableChevronHead, DataTableBody, DataTableRow, DataTableDetail };
