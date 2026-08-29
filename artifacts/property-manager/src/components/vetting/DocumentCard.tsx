import { FileText, Eye, CheckCircle2, Download } from 'lucide-react'
import { DOC_LABELS, type VettingKycDoc } from './mockData'

const BRAND = '#C8102E'

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
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
      {/* Thumbnail area */}
      <div
        className="relative h-36 overflow-hidden bg-slate-100"
        style={{ background: `linear-gradient(135deg, #f8fafc, #e2e8f0)` }}
      >
        {showImg ? (
          <img
            src={doc.url}
            alt={label}
            onError={onImgError}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
            <FileText className="h-10 w-10" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {isImage ? 'Image unavailable' : 'Document'}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-slate-900/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {doc.url && (
            <>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition-transform hover:scale-110"
              >
                <Eye className="h-4 w-4" />
              </a>
              <a
                href={doc.url}
                download={doc.file_name}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition-transform hover:scale-110"
              >
                <Download className="h-4 w-4" />
              </a>
            </>
          )}
        </div>

        {/* Brand accent stripe */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${BRAND}, ${BRAND}80)` }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-slate-900">{label}</p>
          <p className="truncate text-[11px] text-slate-400">{doc.file_name}</p>
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        </span>
      </div>
    </div>
  )
}
