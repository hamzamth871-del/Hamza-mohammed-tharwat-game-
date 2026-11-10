import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Tv, Sparkles, Gamepad2, ExternalLink } from 'lucide-react';
import { generateQRCodeSVG } from '../utils/qrCode';
import { playSound } from '../utils/audio';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  isConnected: boolean;
  onOpenControllerDirectly: () => void;
  soundEnabled: boolean;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  isConnected,
  onOpenControllerDirectly,
  soundEnabled,
}) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://giggle-party.app';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const controllerUrl = `${origin}${pathname}?role=controller&room=${roomCode}`;
  const qrImageSrc = generateQRCodeSVG(controllerUrl, 260);

  const handleCopy = () => {
    playSound.pop(soundEnabled);
    navigator.clipboard.writeText(controllerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl max-w-md w-full p-6 shadow-[6px_6px_0px_#1E1B2E] relative max-h-[95vh] overflow-y-auto">
        <button
          onClick={() => {
            playSound.pop(soundEnabled);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white hover:bg-[#F9DCE9] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] active:translate-y-0.5"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex p-3 rounded-2xl bg-[#FFF0CC] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] mb-2 text-2xl">
            🎮
          </div>
          <h2 className="font-display text-2xl font-black text-[#1E1B2E]">Phone Controller Setup</h2>
          <p className="text-xs text-[#1E1B2E]/70 mt-1 max-w-xs mx-auto">
            Scan this QR code with any smartphone camera to turn your phone into the game controller!
          </p>
        </div>

        {/* Room Code Badge */}
        <div className="bg-[#E5DDFB] border-2 border-[#1E1B2E] rounded-2xl p-3 text-center shadow-[2px_2px_0px_#1E1B2E] mb-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#1E1B2E]/70">
            Room Code
          </div>
          <div className="font-mono font-black text-2xl text-purple-900 tracking-wider">
            {roomCode}
          </div>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-xs font-bold">
            {isConnected ? (
              <span className="text-emerald-700 bg-[#D9F2E7] px-2 py-0.5 rounded-full border border-emerald-300">
                🟢 Phone Controller Connected!
              </span>
            ) : (
              <span className="text-amber-800 bg-[#FFF0CC] px-2 py-0.5 rounded-full border border-amber-300">
                🟡 Ready for Phone to Scan
              </span>
            )}
          </div>
        </div>

        {/* QR Code Container */}
        <div className="bg-white border-2 border-[#1E1B2E] rounded-2xl p-4 flex flex-col items-center justify-center shadow-[3px_3px_0px_#1E1B2E] mb-4">
          <img
            src={qrImageSrc}
            alt={`Scan QR code to connect controller to room ${roomCode}`}
            className="w-48 h-48 object-contain rounded-lg"
          />
          <div className="mt-2 text-[11px] font-bold text-[#1E1B2E]/80 text-center">
            Point smartphone camera & tap the notification link
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Open Controller directly button */}
          <button
            onClick={() => {
              playSound.pop(soundEnabled);
              onOpenControllerDirectly();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl font-display font-black text-xs bg-[#34D399] hover:bg-[#10B981] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Switch This Device to Controller Mode</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopy}
            className="w-full py-2 px-4 rounded-xl font-display font-bold text-xs bg-white hover:bg-[#DCEEFF] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 active:translate-y-0.5"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Controller Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Controller Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
