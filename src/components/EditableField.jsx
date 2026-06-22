import { useState, useRef, useEffect } from 'react';
import { T, fontBody, fontMono } from '../tokens.js';

export default function EditableField({
  value, onChange, mono = false, placeholder = '—',
  multiline = false, dim = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value || '');
  const ref = useRef();

  useEffect(() => { setDraft(value || ''); }, [value]);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== (value || '')) onChange(draft);
  }

  const style = {
    fontFamily: mono ? fontMono : fontBody,
    fontSize: mono ? 11 : 13,
    color: dim ? T.muted : (value ? T.ink : T.muted),
    background: 'transparent',
    minHeight: 20,
    lineHeight: 1.45,
    display: 'block',
    width: '100%',
  };

  if (editing) {
    const sharedInputStyle = {
      ...style,
      background: T.goldBg,
      border: `1px solid ${T.gold}`,
      borderRadius: 2,
      padding: '3px 6px',
      outline: 'none',
      resize: 'vertical',
      boxSizing: 'border-box',
      color: T.ink,
    };

    if (multiline) {
      return (
        <textarea
          ref={ref}
          value={draft}
          rows={3}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Escape') { setDraft(value||''); setEditing(false); } }}
          style={sharedInputStyle}
        />
      );
    }
    return (
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value||''); setEditing(false); } }}
        style={sharedInputStyle}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Clicca per modificare"
      style={{
        ...style,
        cursor: 'text',
        padding: '3px 6px',
        borderRadius: 2,
        border: '1px solid transparent',
        transition: 'border-color 0.1s, background 0.1s',
        whiteSpace: multiline ? 'pre-wrap' : 'normal',
        wordBreak: 'break-word',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = T.line;
        e.currentTarget.style.background  = '#FAFAF8';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.background  = 'transparent';
      }}
    >
      {value || <span style={{ opacity: 0.35 }}>{placeholder}</span>}
    </div>
  );
}
