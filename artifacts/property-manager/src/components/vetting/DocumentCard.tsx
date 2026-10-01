import { FileText, Eye, CheckCircle2, Download } from 'lucide-react'
import { DOC_LABELS, type VettingKycDoc } from './mockData'

const BRAND = '#2563EB'
const ACCENT = '#3B82F6'

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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/[0.06]">
      {/* Thumbnail area */}
      <div
        className="relative h-36 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }}
      >
        {showImg ? (
          <img
            src={doc.url}
            alt={label}
            onError={onImgError}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {isImage ? 'Image unavailable' : 'Document'}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-slate-900/60 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          {doc.url && (
            <>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition-transform hover:scale-110"
                aria-label="View document"
              >
                <Eye className="h-4 w-4" />
              </a>
              <a
                href={doc.url}
                download={doc.file_name}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition-transform hover:scale-110"
                aria-label="Download document"
              >
                <Download className="h-4 w-4" />
              </a>
            </>
          )}
        </div>

        {/* Brand accent gradient stripe */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${BRAND}, ${ACCENT})` }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold tracking-tight text-slate-900">
            {label}
          </p>
          <p className="truncate text-[11px] text-slate-400">{doc.file_name}</p>
        </div>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 ring-1 ring-emerald-200/60">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.4} />
        </span>
      </div>
    </div>
  )
}