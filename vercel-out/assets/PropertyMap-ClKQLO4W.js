import{u as d,j as a,M as p,T as f,a as m,P as g,r as x,L as s}from"./index-CNB8Nlyg.js";function h(){return d().map}delete s.Icon.Default.prototype._getIconUrl;s.Icon.Default.mergeOptions({iconRetinaUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",iconUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",shadowUrl:"https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"});function b(t){return t>=1e6?`₦${(t/1e6).toFixed(1).replace(/\.0$/,"")}M`:t>=1e3?`₦${(t/1e3).toFixed(0)}K`:`₦${t}`}function j(t,n){const r=b(t),o=n?"#16a34a":"#1e293b",i=`
    <div style="
      background:${o};
      color:#fff;
      padding:4px 9px;
      border-radius:20px;
      font-size:12px;
      font-weight:700;
      white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      border:2px solid #fff;
      transform:translateX(-50%);
      position:relative;
    ">
      ${r}
      <div style="
        position:absolute;
        bottom:-7px;
        left:50%;
        transform:translateX(-50%);
        width:0;height:0;
        border-left:6px solid transparent;
        border-right:6px solid transparent;
        border-top:7px solid ${o};
      "></div>
    </div>`;return s.divIcon({html:i,className:"",iconAnchor:[0,36]})}const k={lagos:[6.5244,3.3792],abuja:[9.0579,7.4951],"port harcourt":[4.8156,7.0498],kano:[12.0022,8.592],ibadan:[7.3775,3.947],benin:[6.335,5.627],warri:[5.5167,5.75],enugu:[6.4584,7.5464],kaduna:[10.5222,7.4383],onitsha:[6.1667,6.7833],aba:[5.1066,7.3667],jos:[9.8965,8.8583],ilorin:[8.4966,4.5426],maiduguri:[11.8333,13.15],zaria:[11.0667,7.7]};function w(t){const n=t.toLowerCase();for(const[r,o]of Object.entries(k))if(n.includes(r))return o;return null}function y(t,n){const r=n*137.5*Math.PI/180,o=.008+n%4*.004;return[t[0]+Math.sin(r)*o,t[1]+Math.cos(r)*o]}function v({coords:t}){const n=h();return x.useEffect(()=>{t.length!==0&&(t.length===1?n.setView(t[0],13):n.fitBounds(s.latLngBounds(t),{padding:[40,40],maxZoom:14}))},[t.length]),null}function M({properties:t,hoveredId:n,onMarkerClick:r}){const o=t.map((e,l)=>{const c=w(e.city);return c?{p:e,coords:y(c,l)}:null}).filter(Boolean),i=o.map(e=>e.coords),u=[6.5244,3.3792];return a.jsxs(p,{center:u,zoom:10,className:"w-full h-full",zoomControl:!0,children:[a.jsx(f,{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}),a.jsx(v,{coords:i}),o.map(({p:e,coords:l})=>a.jsx(m,{position:l,icon:j(e.price,n===e.id),eventHandlers:{click:()=>r(e.id)},children:a.jsxs(g,{children:[a.jsx("div",{className:"text-sm font-semibold",children:e.title}),a.jsx("div",{className:"text-xs text-gray-500",children:e.city}),a.jsxs("div",{className:"text-sm font-bold text-green-700 mt-1",children:["₦",Number(e.price).toLocaleString()]})]})},`${e.id}-${n===e.id}`))]})}export{M as default};
