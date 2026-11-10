import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Tv, Sparkles } from 'lucide-react';
import { generateQRCodeSVG } from '../utils/qrCode';
import { playSound } from '../utils/audio';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, soundEnabled }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://giggle-party.app';
  const qrImageSrc = generateQRCodeSVG(currentUrl, 260);

  const handleCopy = () => {
    playSound.pop(soundEnabled);
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-pop-in">
      <div className="bg-[#FFF9F1] border-3 border-[#1E1B2E] rounded-3xl max-w-md w-full p-6 shadow-[6px_6px_0px_#1E1B2E] relative">
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

        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-[#FFF0CC] border-2 border-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E] mb-2">
            <Smartphone className="w-7 h-7 text-[#1E1B2E]" />
          </div>
          <h2 className="font-display text-2xl font-black text-[#1E1B2E]">Scan to Play on Phone</h2>
          <p className="text-xs text-[#1E1B2E]/70 mt-1 max-w-xs mx-auto">
            Scan this QR code with any smartphone camera. One player holds and passes the phone around!
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-white border-2 border-[#1E1B2E] rounded-2xl p-4 flex flex-col items-center justify-center shadow-[3px_3px_0px_#1E1B2E] mb-5">
          <img
            src={qrImageSrc}
            alt="Scan QR code to join game"
            className="w-52 h-52 object-contain rounded-lg"
          />
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-[#D9F2E7] px-2.5 py-1 rounded-full border border-emerald-300">
            <Sparkles className="w-3 h-3" />
            No apps or accounts required
          </div>
        </div>

        {/* How TV Mirroring Works */}
        <div className="bg-[#E5DDFB] border-2 border-[#1E1B2E] rounded-2xl p-3.5 mb-4 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#1E1B2E]">
            <Tv className="w-4 h-4" />
            <span>How the living room setup works:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[#1E1B2E]/80 pl-1 leading-relaxed">
            <li>Keep this screen on your TV, laptop, or projector.</li>
            <li>Pass one phone secretly between all 4 players to vote.</li>
            <li>All final results and vote percentages reveal simultaneously!</li>
          </ol>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopy}
          className="w-full py-2.5 px-4 rounded-xl font-display font-bold text-sm bg-white hover:bg-[#DCEEFF] border-2 border-[#1E1B2E] shadow-[3px_3px_0px_#1E1B2E] text-[#1E1B2E] flex items-center justify-center gap-2 transition-all active:translate-y-0.5"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Link Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Direct Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
