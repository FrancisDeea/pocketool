import { useEffect, useRef, useState } from 'react';

interface TextEditorProps {
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontSize: number;
  fontStyle: string;
  align: string;
  scale: number;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export function TextEditor({
  value: initialValue,
  x,
  y,
  width,
  height,
  rotation,
  fontSize,
  fontStyle,
  align,
  scale,
  onSave,
  onCancel,
}: TextEditorProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(value.length, value.length);
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value, scale]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave(value);
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    top: y,
    left: x,
    width: Math.max(width * scale, 200 * scale),
    minHeight: Math.max(height * scale, 40 * scale),
    fontSize: fontSize * scale,
    fontStyle: fontStyle.includes('italic') ? 'italic' : 'normal',
    fontWeight: fontStyle.includes('bold') ? 'bold' : 'normal',
    fontFamily: 'sans-serif',
    textAlign: align,
    background: 'rgba(59, 130, 246, 0.05)',
    border: '1px solid var(--color-accent)',
    borderRadius: '4px',
    outline: 'none',
    padding: '4px',
    margin: '-5px', // Compensate for padding/border to keep text aligned
    resize: 'none',
    color: 'inherit',
    lineHeight: 1.2,
    zIndex: 1000,
    overflow: 'hidden',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    transform: `rotate(${rotation}deg)`,
    transformOrigin: 'top left',
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      style={style}
      onKeyDown={handleKeyDown}
      onBlur={() => onSave(value)}
    />
  );
}
