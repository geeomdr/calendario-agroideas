import React, { useState, useRef, KeyboardEvent } from 'react';
import styles from './TagInput.module.css';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
}

function normalizeHandle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}

const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  placeholder = 'Ex: @joaosilva · pressione Enter para adicionar',
  label,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = normalizeHandle(raw);
    if (!tag || value.includes(tag)) {
      setInputValue('');
      return;
    }
    onChange([...value, tag]);
    setInputValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <div
        className={styles.field}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span key={i} className={styles.tag}>
            {tag}
            <button
              type="button"
              className={styles.removeBtn}
              onClick={e => { e.stopPropagation(); removeTag(i); }}
              aria-label={`Remover ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className={styles.input}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>
    </div>
  );
};

export default TagInput;
