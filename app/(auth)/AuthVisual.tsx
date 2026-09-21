export default function AuthVisual() {
  return (
    <div aria-hidden className="auth-visual mt-10 overflow-hidden rounded-3xl border border-ink/10 bg-paper p-4">
            <svg viewBox="0 0 560 240" className="h-auto w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="auth-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#354666" fillOpacity=".12" />
                </pattern>
              </defs>
              <rect width="560" height="240" rx="18" fill="url(#auth-grid)" />
              <path d="M145 78 H230 Q250 78 250 98 V120 M145 164 H230 Q250 164 250 144 V120 M310 120 H382" stroke="#354666" strokeOpacity=".2" strokeWidth="2" />
              <path className="auth-flow" d="M145 78 H230 Q250 78 250 98 V120 H310 H382" stroke="#13C182" strokeWidth="2" strokeLinecap="round" strokeDasharray="7 10" />
              <rect x="20" y="48" width="125" height="58" rx="16" fill="white" stroke="#E1E3E8" />
              <rect x="35" y="64" width="26" height="26" rx="8" fill="#EEF2F6" />
              <path d="M42 73h12M42 78h8M42 83h10" stroke="#354666" strokeWidth="1.5" strokeLinecap="round" />
              <text x="72" y="74" fill="#354666" fontSize="12" fontWeight="600">Dossiers</text>
              <text x="72" y="91" fill="#5D6B85" fontSize="10">Tout est suivi</text>
              <rect x="20" y="134" width="125" height="58" rx="16" fill="white" stroke="#E1E3E8" />
              <rect x="35" y="150" width="26" height="26" rx="8" fill="#EEF2F6" />
              <path d="m41 163 5 5 10-11" stroke="#354666" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <text x="72" y="160" fill="#354666" fontSize="12" fontWeight="600">Équipes</text>
              <text x="72" y="177" fill="#5D6B85" fontSize="10">Ensemble</text>
              <circle className="auth-orbit" cx="280" cy="120" r="37" fill="#EEF2F6" />
              <circle cx="280" cy="120" r="28" fill="#354666" />
              <text x="280" y="127" textAnchor="middle" fill="white" fontSize="22" fontWeight="650">W</text>
              <circle className="auth-pulse" cx="306" cy="95" r="7" fill="#13C182" stroke="white" strokeWidth="3" />
              <rect x="382" y="45" width="157" height="150" rx="18" fill="white" stroke="#E1E3E8" />
              <text x="400" y="70" fill="#354666" fontSize="12" fontWeight="600">Votre espace</text>
              <rect x="400" y="82" width="121" height="1" fill="#E1E3E8" />
              <rect x="400" y="98" width="31" height="31" rx="9" fill="#EEF2F6" />
              <rect x="440" y="103" width="61" height="5" rx="2.5" fill="#354666" fillOpacity=".72" />
              <rect x="440" y="116" width="43" height="4" rx="2" fill="#354666" fillOpacity=".2" />
              <rect x="400" y="141" width="121" height="36" rx="12" fill="#EEF2F6" />
              <circle cx="416" cy="159" r="5" fill="#13C182" />
              <rect x="428" y="156" width="71" height="5" rx="2.5" fill="#354666" fillOpacity=".55" />
            </svg>
    </div>
  );
}
