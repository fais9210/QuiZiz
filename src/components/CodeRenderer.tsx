import React, { useState } from 'react';
import { Copy, Check, Terminal, Code2 } from 'lucide-react';

interface CodeRendererProps {
  text?: string;
  codeSnippet?: string;
  codeLanguage?: string;
  className?: string;
}

export const isCodeLike = (str: string): boolean => {
  if (!str) return false;
  // Patterns common in programming code
  const codePatterns = [
    /[;{}()[\]=><]/,
    /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|GROUP BY)\b/i,
    /\b(def|return|import|class|public|private|static|void|int|float|double|char|string|let|const|var|function|if|else|for|while)\b/,
    /\b(console\.log|System\.out\.println|printf|cout|print)\b/,
    /^[a-zA-Z_]\w*\s*\(.*\)/, // function call
    /->|=>|==|!=|<=|>=|\+\+|--/,
  ];
  return codePatterns.some(pattern => pattern.test(str));
};

export function CodeBlock({ 
  code, 
  language = 'code', 
  showLineNumbers = true 
}: { 
  code: string; 
  language?: string; 
  showLineNumbers?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split('\n');

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl text-left">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
            <Terminal className="w-3 h-3 text-blue-400" />
            {language || 'SOURCE CODE'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-all border border-slate-700/50"
          title="Salin Kode"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Body */}
      <div className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-slate-200">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-900/40">
                {showLineNumbers && (
                  <td className="pr-4 select-none text-right text-slate-600 text-[11px] font-mono w-8 align-top">
                    {idx + 1}
                  </td>
                )}
                <td className="whitespace-pre font-mono text-emerald-300/90 selection:bg-blue-600 selection:text-white">
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CodeRenderer({ 
  text = '', 
  codeSnippet, 
  codeLanguage, 
  className = '' 
}: CodeRendererProps) {
  // Parse markdown code blocks in text (```lang\ncode\n```)
  const renderFormattedText = (rawText: string) => {
    if (!rawText) return null;

    // Check for triple backtick code blocks
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      const matchIndex = match.index;
      // Push text before code block
      if (matchIndex > lastIndex) {
        const textBefore = rawText.substring(lastIndex, matchIndex);
        parts.push(renderInlineMarkdown(textBefore, `text-${lastIndex}`));
      }

      const lang = match[1] || 'code';
      const code = match[2];
      parts.push(
        <CodeBlock 
          key={`code-${matchIndex}`} 
          code={code} 
          language={lang} 
        />
      );

      lastIndex = matchIndex + match[0].length;
    }

    // Push remaining text
    if (lastIndex < rawText.length) {
      parts.push(renderInlineMarkdown(rawText.substring(lastIndex), `text-${lastIndex}`));
    }

    return parts.length > 0 ? parts : rawText;
  };

  // Parse inline backticks (`code`) and line breaks
  const renderInlineMarkdown = (inlineText: string, keyPrefix: string) => {
    const inlineRegex = /`([^`]+)`/g;
    const elements: React.ReactNode[] = [];
    let lastPos = 0;
    let inlineMatch;

    while ((inlineMatch = inlineRegex.exec(inlineText)) !== null) {
      const idx = inlineMatch.index;
      if (idx > lastPos) {
        elements.push(
          <span key={`${keyPrefix}-t-${lastPos}`}>
            {inlineText.substring(lastPos, idx)}
          </span>
        );
      }
      elements.push(
        <code 
          key={`${keyPrefix}-c-${idx}`}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-xs font-bold border border-slate-200 dark:border-slate-700"
        >
          {inlineMatch[1]}
        </code>
      );
      lastPos = idx + inlineMatch[0].length;
    }

    if (lastPos < inlineText.length) {
      elements.push(
        <span key={`${keyPrefix}-t-${lastPos}`}>
          {inlineText.substring(lastPos)}
        </span>
      );
    }

    return (
      <span key={keyPrefix} className="whitespace-pre-line">
        {elements}
      </span>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {text && <div>{renderFormattedText(text)}</div>}
      {codeSnippet && (
        <CodeBlock 
          code={codeSnippet} 
          language={codeLanguage || 'code'} 
        />
      )}
    </div>
  );
}
