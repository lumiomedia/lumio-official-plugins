'use client'

import { Pagination } from '@heroui/react'

interface ResultsPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ResultsPagination({ currentPage, totalPages, onPageChange }: ResultsPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center rounded-[1.75rem] border border-white/10 bg-slate-950/60 px-4 py-4">
      <Pagination
        total={totalPages}
        page={currentPage}
        onChange={onPageChange}
        showControls
        siblings={2}
        boundaries={1}
        classNames={{
          wrapper: 'gap-2',
          item: [
            'bg-white/5 border border-white/10 text-slate-200',
            'hover:bg-white/10 hover:!border-accent-400/30 hover:text-white',
            'data-[active=true]:bg-accent-400/90 data-[active=true]:!border-accent-400/70 data-[active=true]:text-slate-950 data-[active=true]:font-semibold',
            'transition-all duration-200',
          ].join(' '),
          prev: 'bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:!border-accent-400/30',
          next: 'bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:!border-accent-400/30',
          cursor: 'bg-accent-400 text-slate-950 font-semibold shadow-sm shadow-accent-500/30',
        }}
      />
    </div>
  )
}
