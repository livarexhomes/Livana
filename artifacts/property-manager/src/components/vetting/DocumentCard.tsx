import { FileText, Eye, CheckCircle2 } from 'lucide-react'
import { DOC_LABELS, type VettingKycDoc } from './mockData'

interface DocumentCardProps {
  doc: VettingKycDoc
  imgErrored: boolean
  onImgError: () => void
}

export default function DocumentCard({ doc, imgErrored, onImgError }: DocumentCardProps) {
  const isImage = /\.(jpe?g|png|webp)$/i.test(doc.file_name)
  const showImg = isImage && !imgErrored && Boolean(doc.url)
  const label = DOC_LABELS[doc.doc_type] ?? doc.doc_type

  return (
    <a
      href={doc.url || '#'}
      target="_blank"
      rel="noreferrer"
      onClick={e => {
        if (!doc.url) e.preventDefault()
      }}
      aria-label={`Open ${label}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#d7e0d9] bg-[#fbfcfa] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6d9b87] hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500"
    >
        <div className="relative flex h-32 items-center justify-center overflow-hidden bg-[#e8efea] dark:bg-slate-800">
        {showImg ? (
          <img
            src={doc.url}
            alt={label}
            onError={onImgError}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-600">
            <FileText className="h-8 w-8" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {isImage ? 'Image unavailable' : 'Document'}
            </span>
          </div>
        )}
          <div className="absolute inset-0 flex items-center justify-center bg-[#18352f]/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fbfcfa] px-3 py-1.5 text-[11px] font-bold text-[#2f7560] shadow-sm">
            <Eye className="h-3.5 w-3.5" /> Preview
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-slate-900 dark:text-white">
            {label}
          </p>
          <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
            {doc.file_name}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
           <CheckCircle2 className="h-3 w-3" />
           Ready to review
        </span>
      </div>
    </a>
  )
}
