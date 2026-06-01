import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (base64Data: string) => void;
  onClose: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Adjust canvas resolution for high-DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2544e6'; // Brand primary color
    ctx.lineWidth = 2.5;
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if it's a touch event
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    // Export signature as Base64 PNG
    const dataURL = canvas.toDataURL('image/png');
    onSave(dataURL);
  };

  return (
    <div className="flex flex-col bg-dark-900 border border-dark-800 rounded-2xl p-4 shadow-glass w-full animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-200">Assinatura do Cliente</span>
        <button 
          onClick={clearCanvas}
          disabled={isEmpty}
          className="text-xs text-slate-400 hover:text-danger-500 disabled:opacity-50 disabled:hover:text-slate-400 flex items-center gap-1 transition-colors"
        >
          <Trash2 size={13} />
          Limpar
        </button>
      </div>

      <div className="relative border-2 border-dashed border-dark-700 bg-dark-950 rounded-xl overflow-hidden h-40">
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-dark-500">Desenhe a assinatura aqui por toque ou mouse</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair sig-canvas"
        />
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={onClose}
          className="flex-1 py-2 text-xs font-medium text-slate-400 bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={isEmpty}
          className="flex-1 py-2 text-xs font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:bg-dark-800 disabled:text-dark-500 flex items-center justify-center gap-1 transition-colors"
        >
          <Check size={14} />
          Salvar Assinatura
        </button>
      </div>
    </div>
  );
};
