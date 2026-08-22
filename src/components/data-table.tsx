"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
}: DataTableProps<TData, TValue>) {
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table's returned helpers are stable by contract but not recognized by the React Compiler.
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-transparent">
                {columns.map((_, columnIndex) => (
                  <TableCell key={columnIndex}>
                    <Skeleton className="h-5 w-full max-w-40" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : isError ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                {errorMessage}
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(onRowClick && "cursor-pointer", isRowActive?.(row.original) && "bg-muted/50")}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function DataTablePagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  return (
    <Pagination className="pt-4">
      <PaginationContent className="w-full justify-between">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            aria-disabled={page <= 1}
            className={cn(page <= 1 && "pointer-events-none opacity-50")}
            onClick={(event) => {
              event.preventDefault();
              if (page > 1) onPageChange(page - 1);
            }}
          />
        </PaginationItem>
        <PaginationItem>
          <span className="text-sm text-muted-foreground">
            Страница {page} из {pageCount}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext
            href="#"
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
