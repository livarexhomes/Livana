/** Replace the existing Loading component with this dependency-free loader. */
export default function LivarexLoader() {
  return (
    <div className="livarex-loader" role="status" aria-live="polite" aria-label="Loading LIVAREX">
      <style>{loaderStyles}</style>
      <div className="lv-load-content">
        <div className="lv-load-stage" aria-hidden="true">
        <div className="lv-load-scene">
          <div className="lv-load-shadow" />
          <div className="lv-load-float">
            <div className="lv-load-house">
              <div className="lv-load-face lv-load-front"><i className="lv-load-window" /><i className="lv-load-door" /></div>
              <div className="lv-load-face lv-load-back"><i className="lv-load-window" /><i className="lv-load-window lv-load-window-right" /></div>
              <div className="lv-load-face lv-load-left"><i className="lv-load-window" /><i className="lv-load-window lv-load-window-right" /></div>
              <div className="lv-load-face lv-load-right"><i className="lv-load-window" /><i className="lv-load-window lv-load-window-right" /></div>
              <div className="lv-load-roof lv-load-roof-left" />
              <div className="lv-load-roof lv-load-roof-right" />
              <div className="lv-load-gable lv-load-gable-front" />
              <div className="lv-load-gable lv-load-gable-back" />
              <div className="lv-load-base" />
            </div>
          </div>
        </div>
        </div>
        <div className="lv-load-brand" aria-hidden="true">LIVA<span>REX</span></div>
        <p className="lv-load-tagline" aria-hidden="true">The Bridge to your new home.</p>
        <div className="lv-load-track" aria-hidden="true"><span /></div>
        <p className="lv-load-caption" aria-hidden="true">Loading your experience<span className="lv-load-dots">…</span></p>
      </div>
    </div>
  )
}

const loaderStyles = `
.livarex-loader{box-sizing:border-box;--lv-scene-scale:1;display:grid;place-items:center;min-height:100vh;min-height:100dvh;width:100%;padding:clamp(16px,4vw,32px);padding-top:max(16px,env(safe-area-inset-top));padding-bottom:max(16px,env(safe-area-inset-bottom));padding-left:max(16px,env(safe-area-inset-left));padding-right:max(16px,env(safe-area-inset-right));background:#fff;color:#0f172a;isolation:isolate;color-scheme:light;font-family:inherit}
.livarex-loader *{box-sizing:border-box}
.lv-load-content{text-align:center;width:min(100%,340px);min-width:0;margin:auto}
.lv-load-stage{position:relative;width:100%;height:calc(230px * var(--lv-scene-scale));margin-bottom:8px}
.lv-load-scene{position:absolute;top:0;left:50%;height:230px;width:260px;margin-left:-130px;transform:scale(var(--lv-scene-scale));transform-origin:50% 0;perspective:800px;perspective-origin:50% 35%}
.lv-load-shadow{position:absolute;width:150px;height:30px;bottom:27px;left:55px;border-radius:50%;background:#2563eb20;filter:blur(10px);animation:lv-load-shadow-breathe 5.6s ease-in-out infinite}
.lv-load-float{position:absolute;top:86px;left:80px;width:100px;height:88px;transform-style:preserve-3d;animation:lv-load-hover 5.6s ease-in-out infinite}
.lv-load-house{position:relative;width:100px;height:88px;transform-style:preserve-3d;transform:rotateX(-18deg) rotateY(-32deg);animation:lv-load-turn 14s linear infinite}
.lv-load-face{position:absolute;inset:0;width:100px;height:88px;border:1px solid #c8daf6;background:#f4f8ff;backface-visibility:hidden}
.lv-load-front{transform:translateZ(50px);background:linear-gradient(145deg,#fff,#eaf2ff)}
.lv-load-back{transform:rotateY(180deg) translateZ(50px);background:#e4eeff}
.lv-load-left{transform:rotateY(-90deg) translateZ(50px);background:#d9e7fc}
.lv-load-right{transform:rotateY(90deg) translateZ(50px);background:#edf4ff}
.lv-load-window{position:absolute;left:16px;top:22px;width:23px;height:27px;border:3px solid #fff;border-radius:2px;background:linear-gradient(135deg,#60a5fa,#2563eb);box-shadow:0 1px 3px #1e40af20}
.lv-load-window:before{content:'';position:absolute;top:0;bottom:0;left:8px;width:2px;background:#dbeafe}
.lv-load-window:after{content:'';position:absolute;left:0;right:0;top:10px;height:2px;background:#dbeafe}
.lv-load-window-right{left:auto;right:16px}
.lv-load-door{position:absolute;right:16px;bottom:0;width:25px;height:46px;border:3px solid #fff;border-bottom:0;border-radius:3px 3px 0 0;background:#1d4ed8}
.lv-load-door:after{content:'';position:absolute;right:4px;top:22px;width:3px;height:3px;border-radius:50%;background:#fbbf24}
.lv-load-gable{position:absolute;left:0;top:-40px;width:100px;height:40px;clip-path:polygon(50% 0,100% 100%,0 100%);background:#edf4ff;backface-visibility:hidden}
.lv-load-gable-front{transform:translateZ(50px)}
.lv-load-gable-back{transform:rotateY(180deg) translateZ(50px);background:#d9e7fc}
.lv-load-roof{position:absolute;left:50px;top:-40px;width:64.04px;height:112px;transform-origin:0 0;background:linear-gradient(90deg,#2563eb,#1d4ed8);border:1px solid #1e40af;backface-visibility:visible}
.lv-load-roof-right{transform:translateZ(56px) rotateZ(38.66deg) rotateX(-90deg)}
.lv-load-roof-left{transform:translateZ(-56px) rotateZ(141.34deg) rotateX(90deg);background:linear-gradient(90deg,#3b82f6,#2563eb)}
.lv-load-base{position:absolute;left:-12px;top:88px;width:124px;height:124px;background:#dbeafe;border:1px solid #bfdbfe;border-radius:9px;transform:translateZ(62px) rotateX(-90deg);transform-origin:50% 0;box-shadow:0 0 0 4px #eff6ff}
.lv-load-brand{font-size:clamp(24px,6vw,28px);line-height:1.2;font-weight:800;letter-spacing:.13em;color:#0f2d5e;margin-left:.13em}
.lv-load-brand span{color:#2563eb}
.lv-load-tagline{font-size:13px;line-height:1.6;color:#64748b;margin:10px 0 25px}
.lv-load-track{height:3px;width:128px;margin:0 auto;border-radius:99px;background:#eaf0fa;overflow:hidden}
.lv-load-track>span{display:block;height:100%;width:44%;border-radius:inherit;background:linear-gradient(90deg,#93c5fd,#2563eb);animation:lv-load-sweep 1.8s ease-in-out infinite}
.lv-load-caption{font-size:11px;letter-spacing:.025em;color:#64748b;margin:13px 0 0}
@keyframes lv-load-turn{from{transform:rotateX(-18deg) rotateY(-32deg)}to{transform:rotateX(-18deg) rotateY(328deg)}}
@keyframes lv-load-hover{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes lv-load-shadow-breathe{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(.85);opacity:.55}}
@keyframes lv-load-sweep{0%{transform:translateX(-105%)}100%{transform:translateX(335%)}}
@media(prefers-reduced-motion:reduce){.lv-load-house,.lv-load-float,.lv-load-shadow,.lv-load-track>span{animation:none}.lv-load-track>span{width:100%;background:#2563eb}}
@media(max-width:480px){.livarex-loader{--lv-scene-scale:.85}.lv-load-tagline{margin:8px 0 20px}.lv-load-caption{line-height:1.6}}
@media(max-width:340px){.livarex-loader{--lv-scene-scale:.72}.lv-load-tagline{font-size:12px}}
@media(max-height:500px){.livarex-loader{--lv-scene-scale:.65}.lv-load-stage{margin-bottom:4px}.lv-load-tagline{margin:6px 0 14px}.lv-load-caption{margin-top:10px}}
@media(max-height:350px){.livarex-loader{--lv-scene-scale:.48}.lv-load-brand{font-size:22px}.lv-load-tagline{margin:4px 0 10px}.lv-load-caption{margin-top:8px}}
`
