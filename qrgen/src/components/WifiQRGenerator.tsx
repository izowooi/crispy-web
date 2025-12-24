"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "react-qr-code";

type EncryptionType = "WPA" | "WEP" | "nopass";

interface WifiConfig {
  ssid: string;
  password: string;
  encryption: EncryptionType;
  hidden: boolean;
}

interface ToastProps {
  message: string;
  visible: boolean;
}

function Toast({ message, visible }: ToastProps) {
  if (!visible) return null;
  
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${visible ? 'toast-enter' : 'toast-exit'}`}>
      <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {message}
      </div>
    </div>
  );
}

function generateWifiString(config: WifiConfig): string {
  const { ssid, password, encryption, hidden } = config;
  
  // Escape special characters in SSID and password
  const escapeString = (str: string) => {
    return str.replace(/[\\;,":]/g, (char) => `\\${char}`);
  };
  
  const escapedSSID = escapeString(ssid);
  const escapedPassword = escapeString(password);
  const hiddenStr = hidden ? "H:true;" : "";
  
  if (encryption === "nopass") {
    return `WIFI:T:nopass;S:${escapedSSID};${hiddenStr};`;
  }
  
  return `WIFI:T:${encryption};S:${escapedSSID};P:${escapedPassword};${hiddenStr};`;
}

export default function WifiQRGenerator() {
  const [config, setConfig] = useState<WifiConfig>({
    ssid: "",
    password: "",
    encryption: "WPA",
    hidden: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<ToastProps>({ message: "", visible: false });
  const qrRef = useRef<HTMLDivElement>(null);

  // URL 파라미터에서 초기값 로드
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const params = new URLSearchParams(window.location.search);
    const ssid = params.get("s");
    const password = params.get("p");
    const encryption = params.get("t") as EncryptionType;
    const hidden = params.get("h") === "true";

    if (ssid) {
      setConfig({
        ssid: decodeURIComponent(ssid),
        password: password ? decodeURIComponent(password) : "",
        encryption: encryption || "WPA",
        hidden,
      });
    }
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast({ message: "", visible: false });
    }, 2000);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!qrRef.current || !config.ssid) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      
      if (ctx) {
        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code centered with padding
        const padding = 40;
        const qrSize = canvas.width - padding * 2;
        ctx.drawImage(img, padding, padding, qrSize, qrSize);
        
        // Add SSID text at bottom
        ctx.fillStyle = "#1a1a2e";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(config.ssid, canvas.width / 2, canvas.height - 12);
      }

      const link = document.createElement("a");
      link.download = `wifi-${config.ssid}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      showToast("QR 코드가 다운로드되었습니다!");
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  }, [config.ssid, showToast]);

  const handleCopyLink = useCallback(() => {
    if (!config.ssid) return;

    const params = new URLSearchParams();
    params.set("s", config.ssid);
    if (config.password) params.set("p", config.password);
    params.set("t", config.encryption);
    if (config.hidden) params.set("h", "true");

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    showToast("링크가 복사되었습니다!");
  }, [config, showToast]);

  const wifiString = config.ssid ? generateWifiString(config) : "";

  return (
    <div className="min-h-screen py-8 px-4 sm:py-12">
      <Toast {...toast} />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-bg mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            WiFi QR 코드 생성기
          </h1>
          <p className="text-foreground/70 max-w-md mx-auto">
            WiFi 정보를 입력하면 QR 코드가 자동으로 생성됩니다.<br />
            스마트폰으로 스캔하면 바로 WiFi에 연결됩니다.
          </p>
        </header>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-card-bg rounded-2xl p-6 shadow-xl border border-border">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              WiFi 정보 입력
            </h2>

            <div className="space-y-5">
              {/* SSID */}
              <div>
                <label htmlFor="ssid" className="block text-sm font-medium mb-2">
                  네트워크 이름 (SSID) <span className="text-red-500">*</span>
                </label>
                <input
                  id="ssid"
                  type="text"
                  value={config.ssid}
                  onChange={(e) => setConfig({ ...config, ssid: e.target.value })}
                  placeholder="예: MyHomeWiFi"
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              {/* Encryption Type */}
              <div>
                <label htmlFor="encryption" className="block text-sm font-medium mb-2">
                  암호화 유형
                </label>
                <select
                  id="encryption"
                  value={config.encryption}
                  onChange={(e) => setConfig({ ...config, encryption: e.target.value as EncryptionType })}
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                >
                  <option value="WPA">WPA/WPA2/WPA3</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">없음 (개방형)</option>
                </select>
              </div>

              {/* Password */}
              {config.encryption !== "nopass" && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    비밀번호
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      placeholder="WiFi 비밀번호 입력"
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-input-bg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-border/50 transition-colors"
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden Network */}
              <div className="flex items-center gap-3">
                <input
                  id="hidden"
                  type="checkbox"
                  checked={config.hidden}
                  onChange={(e) => setConfig({ ...config, hidden: e.target.checked })}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                />
                <label htmlFor="hidden" className="text-sm cursor-pointer">
                  숨겨진 네트워크입니다
                </label>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-green-600 dark:text-green-400">개인정보 보호</p>
                  <p className="text-foreground/70 mt-1">
                    입력한 정보는 서버로 전송되지 않으며, 브라우저에서만 처리됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Display */}
          <div className="bg-card-bg rounded-2xl p-6 shadow-xl border border-border flex flex-col">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QR 코드 미리보기
            </h2>

            <div className="flex-1 flex flex-col items-center justify-center">
              {config.ssid ? (
                <>
                  <div 
                    ref={qrRef} 
                    className="bg-white p-6 rounded-2xl shadow-inner"
                  >
                    <QRCode
                      value={wifiString}
                      size={200}
                      level="M"
                      className="w-full h-auto"
                    />
                  </div>
                  <p className="mt-4 text-sm text-foreground/60 text-center">
                    <span className="font-medium">{config.ssid}</span>
                    {config.encryption !== "nopass" && (
                      <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                        {config.encryption}
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-border/30 flex items-center justify-center">
                    <svg className="w-12 h-12 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <p className="text-foreground/50">
                    WiFi 이름을 입력하면<br />QR 코드가 생성됩니다
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                disabled={!config.ssid}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                다운로드
              </button>
              <button
                onClick={handleCopyLink}
                disabled={!config.ssid}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                링크 복사
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-foreground/50">
          <p>스마트폰 카메라로 QR 코드를 스캔하면 WiFi에 자동으로 연결됩니다.</p>
          <p className="mt-1">iOS, Android 모두 지원됩니다.</p>
        </footer>
      </div>
    </div>
  );
}

