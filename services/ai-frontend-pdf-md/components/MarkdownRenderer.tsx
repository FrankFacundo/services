"use client";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { resolveImageToApi, slugify } from '@/lib/markdown';

export default function MarkdownRenderer({ content, mdRelPath }: { content: string; mdRelPath: string }) {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          img({ node, src, alt, ...props }) {
            const finalSrc = src ? resolveImageToApi(mdRelPath, src) : undefined;
            return (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={finalSrc} alt={alt || ''} className="max-w-full h-auto" />
                {alt && <figcaption className="text-xs text-gray-500">{alt}</figcaption>}
              </figure>
            );
          },
          h1({ node, children, ...props }) { const text = String(children as any); const id = slugify(text); return <h1 id={id} {...props}>{children}</h1>; },
          h2({ node, children, ...props }) { const text = String(children as any); const id = slugify(text); return <h2 id={id} {...props}>{children}</h2>; },
          h3({ node, children, ...props }) { const text = String(children as any); const id = slugify(text); return <h3 id={id} {...props}>{children}</h3>; },
          h4({ node, children, ...props }) { const text = String(children as any); const id = slugify(text); return <h4 id={id} {...props}>{children}</h4>; },
          h5({ node, children, ...props }) { const text = String(children as any); const id = slugify(text); return <h5 id={id} {...props}>{children}</h5>; },
          h6({ node, children, ...props }) { const text = String(children as any); const id = slugify(text); return <h6 id={id} {...props}>{children}</h6>; },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
