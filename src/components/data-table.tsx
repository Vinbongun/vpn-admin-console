"use client";

import { type ColumnDef, type SortingState, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  skeletonRows?: number;
  onRowClick?: (row: TData) => void;
  isRowActive?: (row: TData) => boolean;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  isError,
  errorMessage = "Не удалось загрузить данные.",
  emptyMessage = "Данные не найдены.",
  skeletonRows = 5,
  onRowClick,
  isRowActive,
  sorting,
  onSortingChange,
}: DataTableProps<TData, TValue>) {
  const sortable = Boolean(onSortingChange);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table's returned helpers are stable by contract but not recognized by the React Compiler.
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableSorting: sortable,
    manualSorting: sortable,
    state: sorting ? { sorting } : undefined,
    onSortingChange: onSortingChange ? (updater) => onSortingChange(typeof updater === "function" ? updater(sorting ?? []) : updater) : undefined,
  });
  const rows = table.getRowModel().rows;

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {table.getHeaderGroups()[0]?.headers.map((header) => (
                <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-transparent">
                {columns.map((_, columnIndex) => (
                  <TableCell key={columnIndex}>
                    <Skeleton className="h-5 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (isError) {
    return <ErrorState description={errorMessage} className="border" />;
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyMessage} className="border" />;
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : canSort ? (
                      <Button variant="ghost" size="sm" className="-ml-2.5 h-7 px-2.5 text-xs font-medium text-foreground" onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" ? <ArrowUpIcon /> : header.column.getIsSorted() === "desc" ? <ArrowDownIcon /> : <ChevronsUpDownIcon className="opacity-40" />}
                      </Button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn(onRowClick && "cursor-pointer", isRowActive?.(row.original) && "bg-muted/50")}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function DataTablePagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  return (
    <Pagination className="justify-between">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text="Назад"
            aria-disabled={page <= 1}
            className={cn(page <= 1 && "pointer-events-none opacity-50")}
            onClick={(event) => {
              event.preventDefault();
              if (page > 1) onPageChange(page - 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
      <span className="text-sm text-muted-foreground">
        Страница {page} из {pageCount}
      </span>
      <PaginationContent>
        <PaginationItem>
          <PaginationNext
            href="#"
            text="Далее"
            aria-disabled={page >= pageCount}
            className={cn(page >= pageCount && "pointer-events-none opacity-50")}
            onClick={(event) => {
              event.preventDefault();
              if (page < pageCount) onPageChange(page + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
